import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Search, UserCheck, Check } from 'lucide-react';
import { patientService } from '../services/patientService';
import { inventoryService } from '../services/inventoryService';
import { visitService } from '../services/visitService';
import SearchBar from '../components/common/SearchBar';
import styles from './NewVisitPage.module.css';

const DOSAGE_OPTIONS = [
  '1-0-0', '0-1-0', '0-0-1', '1-1-0', '1-0-1', '0-1-1', '1-1-1',
  '½-0-0', '0-0-½', '½-0-½', '½-½-½', '½-1-½', '1-0-½',
  'SOS', 'SOS (Max 3/day)', 'Stat (Single dose)', 'BD (Twice daily)', 'TDS (Thrice daily)', 'QID (Four times daily)', 'OD (Once daily)', 'HS (Bedtime)', 'AC (Before meals)', 'PC (After meals)',
  'Alternate days (1-0-0)', 'Alternate days (1-0-1)', 'Alternate days (1-1-1)', 'Every 2 days', 'Every 3 days', 'Every 4 days', 'Every 5 days', 'Once weekly', 'Twice weekly', 'Once in 15 days', 'Once monthly',
  'Taper: 1-1-1 → 1-0-1 → 1-0-0', 'Taper: 2-0-2 → 1-0-1 → 1-0-0'
];

const NewVisitPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Patient States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);

  // 2. Vitals & Consultation States
  const [visitForm, setVisitForm] = useState({
    diagnosis: '',
    blood_pressure: '',
    temperature: '',
    sugar: '',
    notes: ''
  });

  // 3. Prescription Cart/Rows
  const [prescriptionRows, setPrescriptionRows] = useState([]);
  const [medicinesList, setMedicinesList] = useState([]);

  // 4. API Submit States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initial load: parse patientId query, load medicines list
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const patientId = searchParams.get('patientId');

    const initializeData = async () => {
      try {
        const medsData = await inventoryService.getAllMedicines();
        setMedicinesList(medsData.medicines || medsData || []);

        if (patientId) {
          setPatientLoading(true);
          const patientHistory = await patientService.getPatientHistory(patientId);
          if (patientHistory && patientHistory.patient) {
            setSelectedPatient(patientHistory.patient);
          }
          setPatientLoading(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to fetch initial page configurations.');
      }
    };

    initializeData();
  }, [location]);

  // Inline patient live search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const isNumeric = /^\d+$/.test(searchQuery.trim());
        let res;
        if (isNumeric) {
          res = await patientService.searchPatients({ phone: searchQuery.trim() });
        } else {
          res = await patientService.searchPatients({ name: searchQuery.trim() });
        }
        setSearchResults(res.patients || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Prescription cart operations
  const addPrescriptionRow = () => {
    setPrescriptionRows([
      ...prescriptionRows,
      { medicine_id: '', dosage: '', duration_days: '', instructions: '', quantity: '', isCustom: false }
    ]);
  };

  const removePrescriptionRow = (index) => {
    setPrescriptionRows(prescriptionRows.filter((_, idx) => idx !== index));
  };

  const updateRowField = (index, field, value) => {
    const updated = [...prescriptionRows];
    updated[index][field] = value;
    setPrescriptionRows(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPatient) {
      setError('Please select a patient to record the visit.');
      return;
    }

    const { diagnosis, blood_pressure, temperature, sugar, notes } = visitForm;

    // Only validate format if a value is entered (all fields are optional)
    if (blood_pressure && !/^\d+\/\d+$/.test(blood_pressure)) {
      setError('Blood pressure must follow SYS/DIA format (e.g. 120/80).');
      return;
    }

    let parsedTemp = null;
    if (temperature) {
      parsedTemp = parseFloat(temperature);
      if (isNaN(parsedTemp) || parsedTemp < 90 || parsedTemp > 110) {
        setError('Temperature must be a valid number between 90 and 110 °F.');
        return;
      }
    }

    // Prescription validation — only validate rows that have a medicine selected
    for (let i = 0; i < prescriptionRows.length; i++) {
      const row = prescriptionRows[i];
      if (!row.medicine_id) continue; // skip empty rows

      const qty = parseInt(row.quantity);
      if (row.quantity && (isNaN(qty) || qty <= 0)) {
        setError(`Row #${i + 1}: Quantity must be a positive number.`);
        return;
      }

      const selectedMed = medicinesList.find(m => m.medicine_id === parseInt(row.medicine_id));
      if (selectedMed && qty > selectedMed.quantity) {
        setError(`Row #${i + 1}: Insufficient stock. Only ${selectedMed.quantity} units of ${selectedMed.medicine_name.toUpperCase()} available.`);
        return;
      }
    }

    setLoading(true);

    try {
      // Create packed notes format
      const combinedNotes = `Blood Sugar: ${sugar || '-'} | Notes: ${notes ? notes.trim() : 'None'}`;
      
      const pad = (num) => String(num).padStart(2, '0');
      const localDate = new Date();
      const localDateTimeString = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())} ${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:${pad(localDate.getSeconds())}`;

      const visitData = {
        patient_id: selectedPatient.patient_id,
        visit_date: localDateTimeString,
        diagnosis: diagnosis ? diagnosis.trim() : 'General Visit',
        blood_pressure: blood_pressure || 'N/A',
        temperature: parsedTemp || 98.6,
        notes: combinedNotes
      };

      // 1. Submit visit
      const visitRes = await visitService.createVisit(visitData);
      const visitId = visitRes.visit?.visit_id;

      if (!visitId) {
        throw new Error('Backend failed to return a valid visit ID.');
      }

      // 2. Submit only rows that have a medicine selected
      for (const row of prescriptionRows) {
        if (!row.medicine_id) continue;
        await visitService.createPrescription({
          visit_id: visitId,
          medicine_id: parseInt(row.medicine_id),
          dosage: (row.dosage && row.dosage.trim()) ? row.dosage.trim() : 'As directed',
          quantity: parseInt(row.quantity) || 1,
          duration_days: parseInt(row.duration_days) || null
        });
      }

      setSuccess('Consultation visit and prescriptions saved successfully!');
      
      setTimeout(() => {
        navigate(`/patients/${selectedPatient.patient_id}`);
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to submit consultation record.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.visitPage}>
      <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {error && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>{success}</div>}

      {/* ─── SECTION 1: PATIENT SELECTION ─── */}
      <section className={styles.searchSection}>
        <h3 className={styles.sectionHeader}>1. Patient Lookup & Demographics</h3>
        
        {!selectedPatient ? (
          <div>
            <div style={{ position: 'relative' }}>
              <SearchBar 
                placeholder="Search patient by name or phone..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            
            {searchResults.length > 0 && (
              <ul className={styles.searchResultsList}>
                {searchResults.map(p => (
                  <li 
                    key={p.patient_id} 
                    className={styles.searchResultItem}
                    onClick={() => selectPatient(p)}
                  >
                    <strong>{p.patient_name.toUpperCase()}</strong> - Age: {p.age} | Phone: {p.phone_number || 'N/A'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className={styles.patientPreviewCard}>
            <div className={styles.patientMeta}>
              <div className={styles.metaGroup}>
                <span className={styles.metaLabel}>Patient Name</span>
                <span className={styles.metaValue}>{selectedPatient.patient_name.toUpperCase()}</span>
              </div>
              <div className={styles.metaGroup}>
                <span className={styles.metaLabel}>Age / Gender</span>
                <span className={styles.metaValue}>{selectedPatient.age} yrs / {selectedPatient.gender}</span>
              </div>
              <div className={styles.metaGroup}>
                <span className={styles.metaLabel}>Phone Number</span>
                <span className={styles.metaValue}>{selectedPatient.phone_number || 'N/A'}</span>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedPatient(null)} disabled={loading}>
              Change Patient
            </button>
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit}>
        {/* ─── SECTION 2: VITALS ─── */}
        <section className={styles.vitalsSection}>
          <h3 className={styles.sectionHeader}>2. Vital Signs & Consultation Details</h3>
          
          <div className={styles.formGrid}>
            <div className="form-group">
              <label htmlFor="blood_pressure">Blood Pressure (SYS/DIA)</label>
              <input 
                type="text" 
                id="blood_pressure"
                className="form-control"
                placeholder="e.g. 120/80"
                value={visitForm.blood_pressure}
                onChange={(e) => setVisitForm({ ...visitForm, blood_pressure: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="sugar">Blood Sugar Level</label>
              <input 
                type="text" 
                id="sugar"
                className="form-control"
                placeholder="e.g. 110 mg/dL"
                value={visitForm.sugar}
                onChange={(e) => setVisitForm({ ...visitForm, sugar: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="temperature">Body Temperature (°F)</label>
              <input 
                type="number" 
                id="temperature"
                step="0.1"
                className="form-control"
                placeholder="e.g. 98.6"
                value={visitForm.temperature}
                onChange={(e) => setVisitForm({ ...visitForm, temperature: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label htmlFor="diagnosis">Diagnosis</label>
            <input 
              type="text" 
              id="diagnosis"
              className="form-control"
              placeholder="e.g. Hypertension / Common Cold / Follow-up"
              value={visitForm.diagnosis}
              onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Physician's Consultation Notes</label>
            <textarea 
              id="notes"
              className="form-control"
              placeholder="Record any clinical observations or guidelines here..."
              rows="3"
              value={visitForm.notes}
              onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
              disabled={loading}
            />
          </div>
        </section>

        {/* ─── SECTION 3: PRESCRIPTIONS ─── */}
        <section className={styles.prescriptionSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)' }}>3. Prescribed Medicines (Stock Deducts Automatically)</h3>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={addPrescriptionRow}
              disabled={loading}
            >
              <Plus size={16} /> Add Medicine
            </button>
          </div>

          {prescriptionRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}>
              No medicines prescribed. Click "Add Medicine" above to specify tablets.
            </div>
          ) : (
            <div>
              {prescriptionRows.map((row, idx) => {
                const selectedMed = medicinesList.find(m => m.medicine_id === parseInt(row.medicine_id));
                const availableStock = selectedMed ? selectedMed.quantity : 0;
                
                return (
                  <div key={idx} className={styles.prescriptionRow}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Medicine *</label>
                      <select 
                        className="form-control"
                        value={row.medicine_id}
                        onChange={(e) => updateRowField(idx, 'medicine_id', e.target.value)}
                        disabled={loading}
                        required
                      >
                        <option value="">Select Tablet</option>
                        {medicinesList.map(m => (
                          <option key={m.medicine_id} value={m.medicine_id}>
                            {m.medicine_name.toUpperCase()} (Available: {m.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Dosage</label>
                      <select
                        className="form-control"
                        value={row.isCustom ? '__custom__' : row.dosage}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            updateRowField(idx, 'isCustom', true);
                            updateRowField(idx, 'dosage', '');
                          } else {
                            updateRowField(idx, 'isCustom', false);
                            updateRowField(idx, 'dosage', e.target.value);
                          }
                        }}
                        disabled={loading}
                      >
                        <option value="">-- Select Dosage --</option>

                        <optgroup label="━━ Daily (Morning-Afternoon-Night)">
                          <option value="1-0-0">1-0-0 &nbsp;&nbsp;Morning only</option>
                          <option value="0-1-0">0-1-0 &nbsp;&nbsp;Afternoon only</option>
                          <option value="0-0-1">0-0-1 &nbsp;&nbsp;Night only</option>
                          <option value="1-1-0">1-1-0 &nbsp;&nbsp;Morning + Afternoon</option>
                          <option value="1-0-1">1-0-1 &nbsp;&nbsp;Morning + Night</option>
                          <option value="0-1-1">0-1-1 &nbsp;&nbsp;Afternoon + Night</option>
                          <option value="1-1-1">1-1-1 &nbsp;&nbsp;Three times daily</option>
                        </optgroup>

                        <optgroup label="━━ Half Tablet">
                          <option value="½-0-0">½-0-0 &nbsp;&nbsp;Half tab morning</option>
                          <option value="0-0-½">0-0-½ &nbsp;&nbsp;Half tab night</option>
                          <option value="½-0-½">½-0-½ &nbsp;&nbsp;Half tab M + N</option>
                          <option value="½-½-½">½-½-½ &nbsp;&nbsp;Half tab TDS</option>
                          <option value="½-1-½">½-1-½ &nbsp;&nbsp;Half M + Full A + Half N</option>
                          <option value="1-0-½">1-0-½ &nbsp;&nbsp;Full morning, Half night</option>
                        </optgroup>

                        <optgroup label="━━ SOS / As Needed">
                          <option value="SOS">SOS &nbsp;&nbsp;If needed only</option>
                          <option value="SOS (Max 3/day)">SOS (Max 3/day)</option>
                          <option value="Stat (Single dose)">Stat — Single dose now</option>
                          <option value="BD (Twice daily)">BD — Twice daily</option>
                          <option value="TDS (Thrice daily)">TDS — Thrice daily</option>
                          <option value="QID (Four times daily)">QID — Four times daily</option>
                          <option value="OD (Once daily)">OD — Once daily</option>
                          <option value="HS (Bedtime)">HS — Bedtime only</option>
                          <option value="AC (Before meals)">AC — Before meals</option>
                          <option value="PC (After meals)">PC — After meals</option>
                        </optgroup>

                        <optgroup label="━━ Alternate / Interval">
                          <option value="Alternate days (1-0-0)">Alternate days — Morning</option>
                          <option value="Alternate days (1-0-1)">Alternate days — M + N</option>
                          <option value="Alternate days (1-1-1)">Alternate days — TDS</option>
                          <option value="Every 2 days">Every 2 days</option>
                          <option value="Every 3 days">Every 3 days</option>
                          <option value="Every 4 days">Every 4 days</option>
                          <option value="Every 5 days">Every 5 days</option>
                          <option value="Once weekly">Once weekly</option>
                          <option value="Twice weekly">Twice weekly</option>
                          <option value="Once in 15 days">Once in 15 days</option>
                          <option value="Once monthly">Once monthly</option>
                        </optgroup>

                        <optgroup label="━━ Tapering">
                          <option value="Taper: 1-1-1 → 1-0-1 → 1-0-0">Taper: TDS → BD → OD</option>
                          <option value="Taper: 2-0-2 → 1-0-1 → 1-0-0">Taper: High → Maintenance</option>
                        </optgroup>

                        <option value="__custom__">✏️ Custom (type manually)</option>
                      </select>

                      {/* Custom dosage text input */}
                      {row.isCustom && (
                        <input
                          type="text"
                          className="form-control"
                          style={{ marginTop: 6 }}
                          placeholder="Type custom dosage..."
                          value={row.dosage}
                          onChange={(e) => updateRowField(idx, 'dosage', e.target.value)}
                          disabled={loading}
                          autoFocus
                        />
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Duration (Days) *</label>
                      <input 
                        type="number" 
                        className="form-control"
                        placeholder="e.g. 5"
                        value={row.duration_days}
                        onChange={(e) => updateRowField(idx, 'duration_days', e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Instructions</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="e.g. After meals"
                        value={row.instructions}
                        onChange={(e) => updateRowField(idx, 'instructions', e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Dispense Qty *</label>
                      <input 
                        type="number" 
                        className="form-control"
                        placeholder="e.g. 10"
                        value={row.quantity}
                        onChange={(e) => updateRowField(idx, 'quantity', e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <button 
                      type="button" 
                      className={styles.removeRowBtn}
                      onClick={() => removePrescriptionRow(idx)}
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '200px', 
              height: '44px',
              backgroundColor: success ? 'var(--success, #16a34a)' : undefined,
              borderColor: success ? 'var(--success, #16a34a)' : undefined,
              transition: 'background-color 0.3s, border-color 0.3s'
            }}
            disabled={loading || !!success}
          >
            {success ? (
              <><Check size={16} /><span>Saved</span></>
            ) : loading ? (
              <><span className="spinner" style={{ borderTopColor: '#fff', width: 14, height: 14 }}></span><span>Saving...</span></>
            ) : (
              <><Save size={16} /><span>Save Record</span></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewVisitPage;
