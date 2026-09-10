import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Check } from 'lucide-react';
import { patientService } from '../services/patientService';
import { inventoryService } from '../services/inventoryService';
import { visitService } from '../services/visitService';
import { staffService } from '../services/staffService';
import SearchBar from '../components/common/SearchBar';
import BillPopup from '../components/common/BillPopup';
import styles from './NewVisitPage.module.css';

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
    notes: '',
    consultation_fee: '250'
  });

  const [nurseVitals, setNurseVitals] = useState(null);
  const [activeVisitId, setActiveVisitId] = useState(null);

  // 3. Prescription Cart/Rows
  const [prescriptionRows, setPrescriptionRows] = useState([]);
  const [medicinesList, setMedicinesList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // 4. API Submit States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [prescriptionSpecialty, setPrescriptionSpecialty] = useState('All');
  const [showBillPopup, setShowBillPopup] = useState(false);
  const [completedBillData, setCompletedBillData] = useState(null);
  const [pastVisits, setPastVisits] = useState([]);

  const userRole = localStorage.getItem('role') || '';
  const isReceptionist = userRole === 'Receptionist';

  useEffect(() => {
    if (!selectedPatient) {
      setNurseVitals(null);
      setActiveVisitId(null);
      setPastVisits([]);
      return;
    }

    const fetchLatestVitals = async () => {
      try {
        const res = await visitService.getPatientVisits(selectedPatient.patient_id);
        const visits = res.visits || [];
        setPastVisits(visits);
        if (visits.length > 0) {
          // Look for any active token waiting for triage or consultation
          const activeToken = visits.find(v => v.diagnosis === 'Pending Triage' || v.diagnosis === 'Pending Consultation') || visits[0];
          
          if (activeToken) {
            setNurseVitals({
              blood_pressure: activeToken.blood_pressure,
              temperature: activeToken.temperature,
              blood_sugar: activeToken.blood_sugar,
              pulse_rate: activeToken.pulse_rate,
              oxygen_level: activeToken.oxygen_level,
              diagnosis: activeToken.diagnosis
            });
            setActiveVisitId(activeToken.visit_id);
            // Pre-fill the visit form fields
            setVisitForm(prev => ({
              ...prev,
              blood_pressure: activeToken.blood_pressure || '',
              temperature: activeToken.temperature || '',
              sugar: activeToken.blood_sugar ? String(activeToken.blood_sugar) : '',
              diagnosis: activeToken.diagnosis === 'Pending Triage' || activeToken.diagnosis === 'Pending Consultation' ? '' : activeToken.diagnosis,
              consultation_fee: activeToken.consultation_fee !== undefined ? String(activeToken.consultation_fee) : '250'
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching patient visits:', err);
      }
    };

    fetchLatestVitals();
  }, [selectedPatient]);

  // Initial load: parse patientId query, load medicines list
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const patientId = searchParams.get('patientId');

    const initializeData = async () => {
      try {
        const medsData = await inventoryService.getAllMedicines();
        setMedicinesList(medsData.medicines || medsData || []);

        const docsRes = await staffService.getActiveDoctors();
        setDoctorsList(docsRes.doctors || []);

        let initialPatient = location.state?.patient || null;
        let initialDocId = initialPatient?.assigned_doctor_id || '';

        if (patientId) {
          setPatientLoading(true);
          const patientHistory = await patientService.getPatientHistory(patientId);
          if (patientHistory && patientHistory.patient) {
            initialPatient = patientHistory.patient;
            initialDocId = patientHistory.patient.assigned_doctor_id || '';
          }
          setPatientLoading(false);
        }

        if (initialPatient) {
          setSelectedPatient(initialPatient);
          setSelectedDoctorId(initialDocId);
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
    setSelectedDoctorId(patient.assigned_doctor_id || '');
    setSearchQuery('');
    setSearchResults([]);
  };

  // Helper to calculate total dosage quantity on the frontend
  const calculateQuantity = (medicineId, dosagePattern, days) => {
    if (!dosagePattern || !days) return '';
    
    const cleanPattern = dosagePattern.replace(/½/g, '0.5');
    const parts = cleanPattern.split('-').map(p => parseFloat(p));
    
    if (parts.length > 0 && parts.every(p => !isNaN(p))) {
        const sum = parts.reduce((a, b) => a + b, 0);
        const rawQty = sum * parseInt(days);
        
        const selectedMed = medicinesList.find(m => m.medicine_id === parseInt(medicineId));
        if (selectedMed) {
            const nameLower = selectedMed.medicine_name.toLowerCase();
            const isLiquid = nameLower.includes('syrup') || 
                              nameLower.includes('susp') || 
                              nameLower.includes('liquid') || 
                              nameLower.includes('ml') || 
                              nameLower.includes('soln') || 
                              nameLower.includes('solution') || 
                              nameLower.includes('drops') ||
                              nameLower.includes('suspension');
            if (isLiquid) {
                return String(Math.round(rawQty * 100) / 100);
            }
        }
        return String(Math.ceil(rawQty));
    }
    
    let dailyTimes = 0;
    const patternUpper = dosagePattern.toUpperCase();
    if (patternUpper.includes('BD') || patternUpper.includes('TWICE')) dailyTimes = 2;
    else if (patternUpper.includes('TDS') || patternUpper.includes('THRICE')) dailyTimes = 3;
    else if (patternUpper.includes('QID') || patternUpper.includes('FOUR')) dailyTimes = 4;
    else if (patternUpper.includes('OD') || patternUpper.includes('ONCE DAILY')) dailyTimes = 1;
    else if (patternUpper.includes('HS') || patternUpper.includes('BEDTIME')) dailyTimes = 1;
    
    if (dailyTimes > 0) {
        return String(dailyTimes * parseInt(days));
    }
    
    return '';
  };

  // Prescription cart operations
  const addPrescriptionRow = () => {
    setPrescriptionRows([
      ...prescriptionRows,
      { medicine_id: '', dosage: '1-0-1', duration_days: '5', instructions: '', quantity: '', isCustom: false, searchText: '', isDropdownOpen: false }
    ]);
  };

  const removePrescriptionRow = (index) => {
    setPrescriptionRows(prescriptionRows.filter((_, idx) => idx !== index));
  };

  const updateRowField = (index, field, value) => {
    const updated = [...prescriptionRows];
    updated[index][field] = value;
    
    // Auto-calculate quantity
    if (field === 'dosage' || field === 'duration_days' || field === 'medicine_id') {
      const row = updated[index];
      const autoQty = calculateQuantity(row.medicine_id, row.dosage, row.duration_days);
      if (autoQty) {
        row.quantity = autoQty;
      }
    }
    
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

    const userRole = localStorage.getItem('role') || '';
    const isReceptionist = userRole === 'Receptionist';

    const { diagnosis, blood_pressure, temperature, sugar, notes } = visitForm;

    if (!isReceptionist) {
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

      // Prescription validation
      for (let i = 0; i < prescriptionRows.length; i++) {
        const row = prescriptionRows[i];
        if (!row.medicine_id) continue;

        const qty = parseFloat(row.quantity);
        if (row.quantity && (isNaN(qty) || qty <= 0)) {
          setError(`Row #${i + 1}: Quantity must be a positive number.`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const combinedNotes = `Blood Sugar: ${sugar || '-'} | Notes: ${notes ? notes.trim() : 'None'}`;
      
      const pad = (num) => String(num).padStart(2, '0');
      const localDate = new Date();
      const localDateTimeString = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())} ${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:${pad(localDate.getSeconds())}`;

      let visitData;
      if (isReceptionist) {
        visitData = {
          patient_id: selectedPatient.patient_id,
          visit_date: localDateTimeString,
          doctor_id: selectedDoctorId ? parseInt(selectedDoctorId) : null,
          diagnosis: 'Pending Triage',
          blood_pressure: 'N/A',
          temperature: null,
          notes: 'OPD Card Issued at Counter',
          consultation_fee: 250.00
        };
      } else {
        let parsedTemp = temperature ? parseFloat(temperature) : null;
        visitData = {
          patient_id: selectedPatient.patient_id,
          visit_date: localDateTimeString,
          doctor_id: selectedDoctorId ? parseInt(selectedDoctorId) : null,
          diagnosis: diagnosis ? diagnosis.trim() : 'General Visit',
          blood_pressure: blood_pressure || 'N/A',
          temperature: parsedTemp || 98.6,
          notes: combinedNotes,
          consultation_fee: parseFloat(visitForm.consultation_fee || '250')
        };
      }

      // 1. Submit or Update visit
      let visitId = activeVisitId;
      if (activeVisitId && !isReceptionist) {
        let parsedTemp = temperature ? parseFloat(temperature) : null;
        await visitService.updateVisit(activeVisitId, {
          diagnosis: diagnosis ? diagnosis.trim() : 'General Consultation',
          blood_pressure: blood_pressure || 'N/A',
          temperature: parsedTemp || 98.6,
          notes: combinedNotes,
          consultation_fee: parseFloat(visitForm.consultation_fee || '250')
        });
      } else {
        const visitRes = await visitService.createVisit(visitData);
        visitId = visitRes.visit?.visit_id;
      }

      if (!visitId) {
        throw new Error('Backend failed to return a valid visit ID.');
      }

      // 2. Submit prescriptions (Only for non-receptionists)
      if (!isReceptionist) {
        for (const row of prescriptionRows) {
          if (!row.medicine_id) continue;
          await visitService.createPrescription({
            visit_id: visitId,
            medicine_id: parseInt(row.medicine_id),
            dosage_pattern: row.dosage,
            days: parseInt(row.duration_days),
            dosage: row.dosage,
            instructions: row.instructions || ''
          });
        }
      }

      const chosenDoc = doctorsList.find(d => d.user_id === parseInt(selectedDoctorId));
      const rxItems = prescriptionRows
        .filter(row => row.medicine_id)
        .map(row => {
          const med = medicinesList.find(m => m.medicine_id === parseInt(row.medicine_id));
          return {
            medicine_name: med ? med.medicine_name : 'Unknown Medicine',
            quantity: parseInt(row.quantity) || 1,
            price_per_unit: med ? parseFloat(med.price) : 0,
            price: med ? parseFloat(med.price) : 0,
            total: (parseInt(row.quantity) || 1) * (med ? parseFloat(med.price) : 0)
          };
        });

      const feeVal = parseFloat(visitForm.consultation_fee || '250');
      const rxTotal = rxItems.reduce((acc, curr) => acc + curr.total, 0);

      setCompletedBillData({
        receipt_type: isReceptionist ? 'OPD Token Slip' : 'Consultation & Prescription Invoice',
        bill_number: `OPD-${visitId}`,
        patient_name: selectedPatient.patient_name,
        patient_id: selectedPatient.patient_id,
        doctor_name: chosenDoc ? chosenDoc.name : 'Attending Doctor',
        visit_id: visitId,
        payment_method: 'Desk Payment',
        consultation_fee: feeVal,
        total_amount: feeVal + rxTotal,
        items: rxItems,
        created_at: new Date()
      });

      setSuccess(isReceptionist ? 'OPD Card Issued Successfully!' : 'Consultation visit and prescriptions saved successfully!');
      
      setTimeout(() => {
        if (isReceptionist) {
          navigate(`/patients/${selectedPatient.patient_id}`);
        } else {
          setShowBillPopup(true);
        }
      }, 1000);

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
                <span className={styles.metaLabel}>Weight</span>
                <span className={styles.metaValue}>{selectedPatient.weight ? `${selectedPatient.weight} kg` : 'N/A'}</span>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedPatient(null)} disabled={loading}>
              Change Patient
            </button>
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit}>
        {isReceptionist && selectedPatient && (
          <section className={styles.searchSection} style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 className={styles.sectionHeader}>2. Assign Consultation Doctor</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '800px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="assign_doctor_select" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Select Doctor *</label>
                <select
                  id="assign_doctor_select"
                  className="form-control"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">-- Select Doctor --</option>
                  {doctorsList.map(doc => (
                    <option key={doc.user_id} value={doc.user_id}>
                      {doc.name} ({doc.department})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Default Consultation Fee (₹)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value="250.00" 
                  disabled 
                  style={{ backgroundColor: '#FAFBFD', color: '#64748b', fontWeight: 600 }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Nurse Vitals Card */}
        {!isReceptionist && nurseVitals && (
          <div style={{
            backgroundColor: '#1e1b4b',
            border: '1px solid #312e81',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            color: '#c7d2fe'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#818cf8', fontWeight: 'bold' }}>
              Nurse Triage Vitals (Recorded at Desk)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
              <div><strong>Blood Pressure:</strong> {nurseVitals.blood_pressure || 'N/A'}</div>
              <div><strong>Temperature:</strong> {nurseVitals.temperature ? `${nurseVitals.temperature} °F` : 'N/A'}</div>
              <div><strong>Blood Sugar:</strong> {nurseVitals.blood_sugar ? `${nurseVitals.blood_sugar} mg/dL` : 'N/A'}</div>
              <div><strong>Pulse Rate:</strong> {nurseVitals.pulse_rate ? `${nurseVitals.pulse_rate} bpm` : 'N/A'}</div>
              <div><strong>Oxygen Level:</strong> {nurseVitals.oxygen_level ? `${nurseVitals.oxygen_level} %` : 'N/A'}</div>
            </div>
          </div>
        )}

        {/* ─── SECTION 2: VITALS ─── */}
        {!isReceptionist && (
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

              <div className="form-group">
                <label htmlFor="consultation_fee">Consultation Fee (₹)</label>
                <input 
                  type="number" 
                  id="consultation_fee"
                  step="0.01"
                  className="form-control"
                  placeholder="e.g. 250"
                  value={visitForm.consultation_fee}
                  onChange={(e) => setVisitForm({ ...visitForm, consultation_fee: e.target.value })}
                  disabled={loading}
                  required
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
        )}

        {/* ─── SECTION 3: PRESCRIPTIONS ─── */}
        {!isReceptionist && (
          <section className={styles.prescriptionSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>3. Prescribed Medicines (Calculates Dispensing Qty Automatically)</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ width: '180px', fontSize: '0.85rem', padding: '6px' }}
                value={prescriptionSpecialty}
                onChange={(e) => setPrescriptionSpecialty(e.target.value)}
                disabled={loading}
              >
                <option value="All">All Specialties</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Gynecology">Gynecology</option>
                <option value="Dermatology">Dermatology</option>
              </select>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={addPrescriptionRow}
                disabled={loading}
              >
                <Plus size={16} /> Add Medicine
              </button>
            </div>
          </div>

          {prescriptionRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}>
              No medicines prescribed. Click "Add Medicine" above to specify tablets.
            </div>
          ) : (
            <div>
              {prescriptionRows.map((row, idx) => {
                return (
                  <div key={idx} className={styles.prescriptionRow}>
                    <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                      <label style={{ fontSize: '0.75rem' }}>Medicine *</label>
                      <input 
                        type="text"
                        className="form-control"
                        placeholder="Search medicine..."
                        value={row.searchText || ''}
                        onBlur={() => {
                          setTimeout(() => {
                            updateRowField(idx, 'isDropdownOpen', false);
                          }, 200);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateRowField(idx, 'searchText', val);
                          updateRowField(idx, 'isDropdownOpen', true);
                          if (!val) {
                            updateRowField(idx, 'medicine_id', '');
                          }
                        }}
                        onFocus={() => updateRowField(idx, 'isDropdownOpen', true)}
                        disabled={loading}
                        required
                      />
                      {row.isDropdownOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          zIndex: 1000,
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}>
                          {medicinesList
                            .filter(m => {
                              const matchesSpecialty = 
                                prescriptionSpecialty === 'All' || 
                                (m.specialties && m.specialties.toLowerCase().includes(prescriptionSpecialty.toLowerCase()));
                              
                              const sTerm = (row.searchText || '').toLowerCase();
                              const matchesSearch = 
                                !sTerm ||
                                m.medicine_name.toLowerCase().includes(sTerm) ||
                                (m.generic_name && m.generic_name.toLowerCase().includes(sTerm)) ||
                                (m.brand_name && m.brand_name.toLowerCase().includes(sTerm));
                              
                              return matchesSpecialty && matchesSearch;
                            })
                            .map(m => (
                              <div
                                key={m.medicine_id}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f1f5f9',
                                  fontSize: '0.82rem',
                                  color: '#334155'
                                }}
                                onClick={() => {
                                  updateRowField(idx, 'medicine_id', m.medicine_id);
                                  updateRowField(idx, 'searchText', `${m.medicine_name.toUpperCase()} (${m.strength || ''} ${m.dosage_form || ''})`);
                                  updateRowField(idx, 'isDropdownOpen', false);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                <strong>{m.medicine_name.toUpperCase()}</strong> - {m.strength} ({m.dosage_form}) | <span style={{ color: m.quantity < 10 ? '#ef4444' : '#16a34a', fontWeight: 'bold' }}>Stock: {m.quantity}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Dosage *</label>
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
                        required
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
                        placeholder="Calculated Qty"
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
        )}

        {!isReceptionist && selectedPatient && pastVisits.length > 0 && (
          <section className={styles.searchSection} style={{ marginTop: '24px', marginBottom: '24px' }}>
            <h3 className={styles.sectionHeader}>4. Patient Treatment & History Records</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pastVisits.filter(v => v.diagnosis !== 'Pending Triage' && v.diagnosis !== 'Pending Consultation').map((visit) => (
                <div key={visit.visit_id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      Consultation Date: {new Date(visit.visit_date).toLocaleDateString()}
                    </span>
                    <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.9rem' }}>
                      Diagnosis: {visit.diagnosis}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                    <strong>Doctor Notes:</strong> {visit.notes || 'None'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '8px', fontSize: '0.8rem', color: '#475569' }}>
                    <span><strong>BP:</strong> {visit.blood_pressure || 'N/A'}</span>
                    <span><strong>Temp:</strong> {visit.temperature ? `${visit.temperature}°F` : 'N/A'}</span>
                    <span><strong>Sugar:</strong> {visit.blood_sugar ? `${visit.blood_sugar} mg/dL` : 'N/A'}</span>
                    <span><strong>Pulse:</strong> {visit.pulse_rate ? `${visit.pulse_rate} bpm` : 'N/A'}</span>
                  </div>
                  {visit.prescriptions && visit.prescriptions.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>Prescribed Medicines:</strong>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyleType: 'disc', fontSize: '0.85rem' }}>
                        {visit.prescriptions.map((rx) => (
                          <li key={rx.prescription_id}>
                            <strong>{rx.medicine_name}</strong> - Pattern: {rx.dosage} | Duration: {rx.days} Days
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              {pastVisits.filter(v => v.diagnosis !== 'Pending Triage' && v.diagnosis !== 'Pending Consultation').length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
                  No past consultation treatments recorded for this patient.
                </div>
              )}
            </div>
          </section>
        )}

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
      <BillPopup 
        isOpen={showBillPopup}
        onClose={() => {
          setShowBillPopup(false);
          navigate(`/patients/${selectedPatient.patient_id}`);
        }}
        billData={completedBillData}
      />
    </div>
  );
};

export default NewVisitPage;
