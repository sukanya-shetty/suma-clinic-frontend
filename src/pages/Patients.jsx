import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Search, 
  UserPlus, 
  User, 
  History, 
  FileText, 
  Activity, 
  Plus, 
  Trash2, 
  Printer, 
  PlusCircle, 
  X,
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import './Patients.css';

const Patients = () => {
  const userRole = localStorage.getItem('role') || 'Staff';


  // 1. Core States
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [medicines, setMedicines] = useState([]); // Loaded for prescription select
  const [loading, setLoading] = useState(false);

  // 2. Register Patient Modal/Form States
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    patient_name: '',
    phone_number: '',
    age: '',
    gender: 'Male',
    address: ''
  });
  const [regError, setRegError] = useState('');

  // 3. Visit Creator Form States (Doctor-only)
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({
    diagnosis: '',
    blood_pressure: '',
    sugar_level: '',
    temperature: '',
    notes: ''
  });
  const [prescriptions, setPrescriptions] = useState([]); // List of items being prescribed
  const [currentPrescription, setCurrentPrescription] = useState({
    medicine_id: '',
    dosage: '',
    duration_days: '',
    quantity: '',
    instructions: ''
  });
  const [visitError, setVisitError] = useState('');
  const [visitSuccess, setVisitSuccess] = useState('');

  // 4. Notifications
  const [notification, setNotification] = useState(null);

  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 5. Load Initial Patients List
  const loadPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patients');
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error(err);
      triggerNotification('danger', 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  // Load Inventory for Autocomplete suggestions
  const loadMedicines = async () => {
    try {
      const res = await api.get('/inventory/medicines');
      setMedicines(res.data.medicines || []);
    } catch (err) {
      console.error('Failed to load medicines list:', err);
    }
  };

  useEffect(() => {
    loadPatients();
    loadMedicines();
  }, []);

  // 6. Handle Search Input
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadPatients();
      return;
    }
    setLoading(true);
    try {
      // Try searching by phone first, fallback to name query
      const isNum = /^\d+$/.test(searchQuery);
      const url = isNum 
        ? `/patients/search?phone=${searchQuery}`
        : `/patients/search?name=${searchQuery}`;
      const res = await api.get(url);
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error(err);
      triggerNotification('danger', 'Search query failed.');
    } finally {
      setLoading(false);
    }
  };

  // 7. Select Patient and fetch history
  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setHistory(null);
    try {
      const res = await api.get(`/patients/${patient.patient_id}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
      triggerNotification('danger', 'Failed to load patient history records.');
    }
  };

  // 8. Register new Patient Submit
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegError('');
    const { patient_name, phone_number, age, gender, address } = regForm;

    if (!patient_name || !age || !gender || !phone_number) {
      setRegError('Name, Age, Gender, and Phone Number are required.');
      return;
    }

    if (phone_number.length !== 10 || !/^\d+$/.test(phone_number)) {
      setRegError('Phone number must be exactly 10 digits.');
      return;
    }

    try {
      const res = await api.post('/patients/register', {
        patient_name,
        phone_number,
        age: parseInt(age),
        gender,
        address
      });

      if (res.status === 201) {
        triggerNotification('success', 'Patient registered successfully!');
        setShowRegModal(false);
        setRegForm({
          patient_name: '',
          phone_number: '',
          age: '',
          gender: 'Male',
          address: ''
        });
        loadPatients();
        handleSelectPatient(res.data.patient);
      }
    } catch (err) {
      setRegError(err.response?.data?.error || 'Registration failed.');
    }
  };

  // 9. Manage items during prescription setup
  const addPrescriptionItem = () => {
    const { medicine_id, dosage, duration_days, quantity, instructions } = currentPrescription;

    if (!medicine_id || !dosage || !quantity) {
      setVisitError('Select medicine, dosage and quantity to prescribe.');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setVisitError('Quantity must be a positive number.');
      return;
    }

    const selectedMed = medicines.find(m => m.medicine_id === parseInt(medicine_id));
    if (!selectedMed) return;

    // Check inventory stock quantity before adding
    if (selectedMed.quantity < qty) {
      setVisitError(`Insufficient stock. Available: ${selectedMed.quantity} units.`);
      return;
    }

    // Check if duplicate prescription item
    const duplicate = prescriptions.find(p => p.medicine_id === selectedMed.medicine_id);
    if (duplicate) {
      setVisitError('This medicine is already added to the prescription list.');
      return;
    }

    setPrescriptions([...prescriptions, {
      ...currentPrescription,
      medicine_id: selectedMed.medicine_id,
      medicine_name: selectedMed.medicine_name,
      quantity: qty,
      duration_days: duration_days ? parseInt(duration_days) : null
    }]);

    // Reset current prescription inputs
    setCurrentPrescription({
      medicine_id: '',
      dosage: '',
      duration_days: '',
      quantity: '',
      instructions: ''
    });
    setVisitError('');
  };

  const removePrescriptionItem = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  // 10. Record Visit & Save prescriptions (unified transaction)
  const handleSubmitVisit = async (e) => {
    e.preventDefault();
    setVisitError('');
    setVisitSuccess('');

    const { diagnosis, blood_pressure, sugar_level, temperature, notes } = visitForm;

    // Vitals validation
    if (!diagnosis || !blood_pressure || !temperature) {
      setVisitError('Required visit fields: Diagnosis, Blood Pressure, and Temperature.');
      return;
    }

    if (!blood_pressure.match(/^\d+\/\d+$/)) {
      setVisitError('Blood pressure must be in SYS/DIA format (e.g. 120/80).');
      return;
    }

    const temp = parseFloat(temperature);
    if (isNaN(temp) || temp < 90 || temp > 110) {
      setVisitError('Temperature must be a number between 90 and 110.');
      return;
    }

    setVisitSubmitLoading(true);

    try {
      // STEP A: Create Visit
      const visitRes = await api.post('/visits', {
        patient_id: selectedPatient.patient_id,
        visit_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        diagnosis,
        blood_pressure,
        sugar_level: sugar_level || null,
        temperature: temp,
        notes
      });

      const visit_id = visitRes.data.visit.visit_id;

      // STEP B: Create Prescriptions sequentially
      for (const p of prescriptions) {
        await api.post('/prescriptions', {
          visit_id,
          medicine_id: p.medicine_id,
          dosage: p.dosage,
          quantity: p.quantity,
          duration_days: p.duration_days,
          instructions: p.instructions || null
        });
      }

      setVisitSuccess('Visit and prescriptions recorded successfully! Stock updated.');
      triggerNotification('success', 'Visit successfully registered.');
      
      // Clean form states
      setVisitForm({
        diagnosis: '',
        blood_pressure: '',
        sugar_level: '',
        temperature: '',
        notes: ''
      });
      setPrescriptions([]);
      
      // Reload history and patient lists
      handleSelectPatient(selectedPatient);
      loadMedicines(); // Refresh stock list

      setTimeout(() => setShowVisitModal(false), 2000);

    } catch (err) {
      setVisitError(err.response?.data?.error || 'Failed to complete visit transaction.');
    } finally {
      setVisitSubmitLoading(false);
    }
  };

  const [visitSubmitLoading, setVisitSubmitLoading] = useState(false);

  return (
    <div className="patients-panel">
      
      {/* Toast Notification Alert */}
      {notification && (
        <div className={`toast-notification ${notification.type} animate-fade-in`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ─── LEFT: PATIENTS DIRECTORY ─── */}
      <section className="directory-side glass-card">
        
        {/* Search & Actions Header */}
        <div className="directory-header">
          <form onSubmit={handleSearch} className="search-box">
            <input 
              type="text" 
              placeholder="Search Name or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">
              <Search size={18} />
            </button>
          </form>

          <button onClick={() => setShowRegModal(true)} className="reg-btn-trigger">
            <UserPlus size={18} />
            <span>Register</span>
          </button>
        </div>

        {/* Patients Grid */}
        <div className="directory-body">
          {loading ? (
            <div className="dir-loading"><span className="spinner"></span></div>
          ) : patients.length === 0 ? (
            <div className="dir-empty">No patients found.</div>
          ) : (
            <ul className="patients-list">
              {patients.map(p => (
                <li 
                  key={p.patient_id} 
                  className={`patient-item-row ${selectedPatient?.patient_id === p.patient_id ? 'active' : ''}`}
                  onClick={() => handleSelectPatient(p)}
                >
                  <div className="patient-initial">
                    {p.patient_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="patient-summary">
                    <p className="p-name">{p.patient_name}</p>
                    <p className="p-details">{p.gender} • {p.age} yrs • {p.phone_number}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </section>

      {/* ─── RIGHT: MEDICAL RECORDS VIEWPORT ─── */}
      <section className="viewport-side">
        {selectedPatient ? (
          <div className="records-layout">
            
            {/* Demographics Card */}
            <div className="demographics-card glass-card animate-fade-in">
              <div className="demographics-main">
                <div className="demo-icon">
                  <User size={24} />
                </div>
                <div className="demo-details">
                  <h3>{selectedPatient.patient_name}</h3>
                  <p>{selectedPatient.gender} • {selectedPatient.age} years old • Phone: <strong>{selectedPatient.phone_number}</strong></p>
                  {selectedPatient.address && <p className="address-label">Address: {selectedPatient.address}</p>}
                </div>
              </div>

              {/* Action Toolbar */}
              {userRole === 'Doctor' && (
                <div className="demo-actions">
                  <button onClick={() => setShowVisitModal(true)} className="add-visit-btn">
                    <Plus size={18} />
                    Record Visit
                  </button>
                </div>
              )}
            </div>

            {/* Visit History Log */}
            <div className="history-container glass-card animate-fade-in">
              <div className="panel-header">
                <h3>Clinical Medical History</h3>
                <span className="badge-count blue">{(history?.visits || []).length} Visits</span>
              </div>

              {!history ? (
                <div className="history-loading"><span className="spinner"></span> Loading history logs...</div>
              ) : history.visits.length === 0 ? (
                <div className="history-empty">
                  <History size={32} className="empty-icon" />
                  <p>No previous visit logs recorded for this patient.</p>
                </div>
              ) : (
                <div className="timeline">
                  {history.visits.map((visit) => (
                    <div key={visit.visit_id} className="timeline-item">
                      <div className="timeline-marker">
                        <Activity size={16} />
                      </div>
                      
                      <div className="timeline-content">
                        <div className="visit-meta">
                          <span className="visit-date">
                            <Calendar size={12} />
                            {new Date(visit.visit_date).toLocaleDateString()} at {new Date(visit.visit_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>

                        <div className="visit-diagnose">
                          <h4>Diagnosis: <span>{visit.diagnosis}</span></h4>
                        </div>

                        {/* Vitals metrics Grid */}
                        <div className="vitals-row">
                          <div className="vital-badge">
                            <span className="vital-label">BP:</span>
                            <span className="vital-val">{visit.blood_pressure}</span>
                          </div>
                          {visit.sugar_level && (
                            <div className="vital-badge">
                              <span className="vital-label">Sugar:</span>
                              <span className="vital-val">{visit.sugar_level}</span>
                            </div>
                          )}
                          <div className="vital-badge">
                            <span className="vital-label">Temp:</span>
                            <span className="vital-val">{visit.temperature}°F</span>
                          </div>
                        </div>

                        {visit.notes && (
                          <div className="visit-notes">
                            <p><strong>Clinical Notes:</strong> {visit.notes}</p>
                          </div>
                        )}

                        {/* Prescribed Medicines display */}
                        {visit.prescriptions && visit.prescriptions.length > 0 && (
                          <div className="prescription-history-list">
                            <h5>Prescribed Medicines:</h5>
                            <table>
                              <thead>
                                <tr>
                                  <th>Medicine Name</th>
                                  <th>Dosage</th>
                                  <th>Qty</th>
                                  <th>Days</th>
                                  <th>Instructions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visit.prescriptions.map((p) => (
                                  <tr key={p.prescription_id}>
                                    <td><strong>{p.medicine_name.toUpperCase()}</strong></td>
                                    <td>{p.dosage}</td>
                                    <td>{p.quantity} units</td>
                                    <td>{p.duration_days || '-'}</td>
                                    <td>{p.instructions || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="empty-viewport-card glass-card">
            <FileText size={48} className="empty-icon" />
            <h3>No Patient Selected</h3>
            <p>Select a patient from the directory list, or register a new one to review medical records and add visits.</p>
          </div>
        )}
      </section>

      {/* ─── MODAL 1: REGISTER NEW PATIENT ─── */}
      {showRegModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-card animate-fade-in">
            <div className="modal-header">
              <h3>Register New Patient</h3>
              <button onClick={() => setShowRegModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleRegisterPatient} className="modal-form">
              {regError && <div className="error-box">{regError}</div>}

              <div className="input-group">
                <label>Patient Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={regForm.patient_name}
                  onChange={(e) => setRegForm({...regForm, patient_name: e.target.value})}
                />
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Age (Years)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 35"
                    value={regForm.age}
                    onChange={(e) => setRegForm({...regForm, age: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label>Gender</label>
                  <select 
                    value={regForm.gender} 
                    onChange={(e) => setRegForm({...regForm, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Phone Number (10-digit unique ID)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 9876543210"
                  value={regForm.phone_number}
                  onChange={(e) => setRegForm({...regForm, phone_number: e.target.value})}
                />
              </div>

              <div className="input-group">
                <label>Home Address (Optional)</label>
                <textarea 
                  placeholder="Enter current address..."
                  rows={3}
                  value={regForm.address}
                  onChange={(e) => setRegForm({...regForm, address: e.target.value})}
                />
              </div>

              <button type="submit" className="login-btn">Register Patient</button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: RECORD VISIT & PRESCRIPTION ─── */}
      {showVisitModal && (
        <div className="modal-overlay">
          <div className="modal-container visit-modal-size glass-card animate-fade-in">
            <div className="modal-header">
              <h3>Record New Visit & Prescription</h3>
              <button onClick={() => setShowVisitModal(false)} className="close-btn"><X size={20} /></button>
            </div>

            <div className="visit-modal-content-split">
              {/* Left Column: Vitals Form */}
              <form onSubmit={handleSubmitVisit} className="visit-form-left">
                {visitError && <div className="error-box">{visitError}</div>}
                {visitSuccess && <div className="success-box">{visitSuccess}</div>}

                <div className="panel-sub-header"><h4>1. Vitals & Diagnosis</h4></div>

                <div className="input-group">
                  <label>Diagnosis Details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acute Migraine / Common Flu"
                    value={visitForm.diagnosis}
                    onChange={(e) => setVisitForm({...visitForm, diagnosis: e.target.value})}
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>Blood Pressure (SYS/DIA)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 120/80"
                      value={visitForm.blood_pressure}
                      onChange={(e) => setVisitForm({...visitForm, blood_pressure: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label>Sugar Level (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 110 mg/dL"
                      value={visitForm.sugar_level}
                      onChange={(e) => setVisitForm({...visitForm, sugar_level: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label>Temperature (°F)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 98.6"
                      value={visitForm.temperature}
                      onChange={(e) => setVisitForm({...visitForm, temperature: e.target.value})}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Clinical Notes</label>
                  <textarea 
                    placeholder="Enter notes on check-up..."
                    rows={2}
                    value={visitForm.notes}
                    onChange={(e) => setVisitForm({...visitForm, notes: e.target.value})}
                  />
                </div>

                <button type="submit" className="login-btn" style={{marginTop: '20px'}} disabled={visitSubmitLoading}>
                  {visitSubmitLoading ? 'Saving Transaction...' : 'Save Visit & Prescriptions'}
                </button>
              </form>

              {/* Right Column: Prescription Builder */}
              <div className="prescription-builder-right">
                <div className="panel-sub-header"><h4>2. Prescribe Medicines</h4></div>

                {/* Single Item Form Add */}
                <div className="prescribe-item-add-box">
                  <div className="form-row">
                    <div className="input-group" style={{gridColumn: 'span 2'}}>
                      <label>Medicine Selection</label>
                      <select 
                        value={currentPrescription.medicine_id}
                        onChange={(e) => setCurrentPrescription({...currentPrescription, medicine_id: e.target.value})}
                      >
                        <option value="">-- Choose Stock Medicine --</option>
                        {medicines.map(m => (
                          <option key={m.medicine_id} value={m.medicine_id}>
                            {m.medicine_name.toUpperCase()} (Avail: {m.quantity} tab)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label>Dosage</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1-0-1 (twice daily)"
                        value={currentPrescription.dosage}
                        onChange={(e) => setCurrentPrescription({...currentPrescription, dosage: e.target.value})}
                      />
                    </div>
                    <div className="input-group">
                      <label>Duration (Days)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 5"
                        value={currentPrescription.duration_days}
                        onChange={(e) => setCurrentPrescription({...currentPrescription, duration_days: e.target.value})}
                      />
                    </div>
                    <div className="input-group">
                      <label>Total Qty</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 10"
                        value={currentPrescription.quantity}
                        onChange={(e) => setCurrentPrescription({...currentPrescription, quantity: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Usage Instructions (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. After meals / Empty stomach"
                      value={currentPrescription.instructions}
                      onChange={(e) => setCurrentPrescription({...currentPrescription, instructions: e.target.value})}
                    />
                  </div>

                  <button type="button" onClick={addPrescriptionItem} className="login-btn staff-submit" style={{background: 'var(--accent)'}}>
                    <PlusCircle size={16} /> Add to Prescription
                  </button>
                </div>

                {/* Grid list of medicines added to prescription */}
                <div className="prescribed-items-list-container">
                  <h4>Medicines Prescribed ({prescriptions.length})</h4>
                  {prescriptions.length === 0 ? (
                    <p className="no-items">No items prescribed yet.</p>
                  ) : (
                    <ul className="prescribed-items-list">
                      {prescriptions.map((item, idx) => (
                        <li key={idx} className="prescribed-item">
                          <div className="item-details">
                            <p className="item-med-title"><strong>{item.medicine_name.toUpperCase()}</strong> - Qty: {item.quantity}</p>
                            <p className="item-med-desc">Dosage: {item.dosage} • {item.duration_days || '-'} days • {item.instructions || 'no notes'}</p>
                          </div>
                          <button type="button" onClick={() => removePrescriptionItem(idx)} className="item-remove-btn">
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Patients;
