import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, CalendarRange, HeartPulse, User, Pencil, X, Save, Check } from 'lucide-react';
import { patientService } from '../services/patientService';
import { visitService } from '../services/visitService';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import styles from './PatientDetailPage.module.css';

const PatientDetailPage = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();

  const isDoctor = user && user.role === 'Doctor';

  // ─── Edit Visit State ───
  const [editingVisitId, setEditingVisitId] = useState(null);
  const [editForm, setEditForm] = useState({
    diagnosis: '', blood_pressure: '', temperature: '', sugar: '', notes: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // ─── Delete prescription state ───
  const [deletingPrescId, setDeletingPrescId] = useState(null);

  // ─── Edit Patient State ───
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientForm, setPatientForm] = useState({
    patient_name: '',
    phone_number: '',
    age: '',
    gender: 'Male',
    address: ''
  });
  const [patientFormError, setPatientFormError] = useState('');
  const [patientFormSuccess, setPatientFormSuccess] = useState('');
  const [patientFormLoading, setPatientFormLoading] = useState(false);

  const openEditPatientModal = () => {
    if (!historyData || !historyData.patient) return;
    const p = historyData.patient;
    setPatientForm({
      patient_name: p.patient_name || '',
      phone_number: p.phone_number || '',
      age: p.age || '',
      gender: p.gender || 'Male',
      address: p.address || ''
    });
    setPatientFormError('');
    setPatientFormSuccess('');
    setIsPatientModalOpen(true);
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setPatientFormError('');
    setPatientFormSuccess('');

    const { patient_name, phone_number, age, gender, address } = patientForm;

    if (!patient_name || !age || !gender || !phone_number) {
      setPatientFormError('Name, Age, Gender, and Phone Number are required.');
      return;
    }

    if (phone_number.length !== 10) {
      setPatientFormError('Phone number must be exactly 10 digits.');
      return;
    }

    setPatientFormLoading(true);
    try {
      await patientService.updatePatient(id, {
        name: patient_name,
        phone_number: phone_number,
        age: parseInt(age),
        gender: gender,
        address: address
      });
      setPatientFormSuccess('Patient details updated successfully!');
      await loadPatientHistory(); // reload patient info on screen
      setTimeout(() => {
        setIsPatientModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      setPatientFormError(err.response?.data?.error || 'Failed to update patient details.');
    } finally {
      setPatientFormLoading(false);
    }
  };

  const loadPatientHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await patientService.getPatientHistory(id);
      setHistoryData(data);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve patient medical history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientHistory();
  }, [id]);

  // ─── Patient Delete ───
  const handleDeletePatient = async () => {
    if (!window.confirm('WARNING: Deleting this patient will permanently erase their entire clinical visit history and prescriptions. Proceed?')) return;
    setDeleteLoading(true);
    setError('');
    try {
      await patientService.deletePatient(id);
      navigate('/patients');
    } catch (err) {
      console.error(err);
      setError('Failed to delete patient. Ensure you have Doctor privileges.');
      setDeleteLoading(false);
    }
  };

  // ─── Helpers for packed notes ───
  const parseSugar = (notes) => {
    if (!notes) return '';
    const match = notes.match(/Blood Sugar:\s*([\d\w/.]+)/i);
    return match ? match[1] : '';
  };

  const parseNotesOnly = (notes) => {
    if (!notes) return '-';
    const parts = notes.split(/\|\s*Notes:\s*/i);
    if (parts.length > 1) return parts[1].trim() || '-';
    if (notes.startsWith('Blood Sugar:')) {
      const ni = notes.toLowerCase().indexOf('notes:');
      if (ni > -1) return notes.substring(ni + 6).trim() || '-';
      return '-';
    }
    return notes;
  };

  const buildNotes = (sugar, notes) =>
    `Blood Sugar: ${sugar} | Notes: ${notes ? notes.trim() : 'None'}`;

  // ─── Start editing a visit ───
  const startEdit = (visit) => {
    setEditingVisitId(visit.visit_id);
    setEditError('');
    setEditForm({
      diagnosis: visit.diagnosis || '',
      blood_pressure: visit.blood_pressure || '',
      temperature: visit.temperature || '',
      sugar: parseSugar(visit.notes),
      notes: parseNotesOnly(visit.notes) === '-' ? '' : parseNotesOnly(visit.notes)
    });
  };

  const cancelEdit = () => {
    setEditingVisitId(null);
    setEditError('');
  };

  // ─── Save edited visit ───
  const handleSaveEdit = async (visitId) => {
    setEditError('');
    const { diagnosis, blood_pressure, temperature, sugar, notes } = editForm;

    // Only validate format if a value is entered (all fields are optional)
    if (blood_pressure && !/^\d+\/\d+$/.test(blood_pressure)) {
      setEditError('Blood pressure must follow SYS/DIA format (e.g. 120/80).');
      return;
    }

    let parsedTemp = null;
    if (temperature) {
      parsedTemp = parseFloat(temperature);
      if (isNaN(parsedTemp) || parsedTemp < 90 || parsedTemp > 110) {
        setEditError('Temperature must be a valid number between 90 and 110 °F.');
        return;
      }
    }

    setEditLoading(true);
    try {
      await visitService.updateVisit(visitId, {
        diagnosis: diagnosis ? diagnosis.trim() : 'General Visit',
        blood_pressure: blood_pressure || 'N/A',
        temperature: parsedTemp || 98.6,
        notes: buildNotes(sugar || '-', notes)
      });
      setEditingVisitId(null);
      await loadPatientHistory(); // refresh
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.error || 'Failed to update visit.');
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Delete prescription ───
  const handleDeletePrescription = async (prescriptionId, medicineName) => {
    if (!window.confirm(`Remove "${medicineName.toUpperCase()}" from this prescription? Stock will be restored.`)) return;
    setDeletingPrescId(prescriptionId);
    try {
      await visitService.deletePrescription(prescriptionId);
      await loadPatientHistory(); // refresh
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete prescription.');
    } finally {
      setDeletingPrescId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-inline" style={{ padding: '64px' }}>
        <span className="spinner"></span> Loading medical record...
      </div>
    );
  }

  if (error && !historyData) {
    return (
      <div className="card">
        <button onClick={() => navigate('/patients')} className="btn btn-secondary" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to Directory
        </button>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  const patient = historyData?.patient || {};
  const visits = historyData?.visits || [];

  return (
    <div className={styles.detailGrid}>
      {/* ─── LEFT SIDEBAR PANEL: PATIENT INFO ─── */}
      <section className={styles.leftCard}>
        <button onClick={() => navigate('/patients')} className="btn btn-secondary" style={{ width: '100%', marginBottom: 20 }}>
          <ArrowLeft size={16} /> Back to Directory
        </button>

        <div className={styles.patientHeader}>
          <div className={styles.avatar}><User size={32} /></div>
          <h3 className={styles.patientName}>{patient.patient_name ? patient.patient_name.toUpperCase() : 'UNKNOWN'}</h3>
          <span className={styles.patientRole}>Patient ID: #{patient.patient_id}</span>
        </div>

        <div className={styles.infoList}>
          {[
            { label: 'Age', value: `${patient.age} years` },
            { label: 'Gender', value: patient.gender },
            { label: 'Phone Number', value: patient.phone_number || 'N/A' },
            { label: 'Home Address', value: patient.address || 'N/A' },
            { label: 'Registered On', value: patient.registration_date ? new Date(patient.registration_date).toLocaleDateString() : '-' }
          ].map(({ label, value }) => (
            <div key={label} className={styles.infoItem}>
              <span className={styles.infoLabel}>{label}</span>
              <span className={styles.infoValue}>{value}</span>
            </div>
          ))}
        </div>

        <div className={styles.actionPanel}>
          <button onClick={() => navigate(`/visits/new?patientId=${patient.patient_id}`)} className="btn btn-primary" style={{ width: '100%' }}>
            <CalendarRange size={16} /><span>Record New Visit</span>
          </button>
          <button onClick={openEditPatientModal} className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Pencil size={16} /><span>Edit Patient Info</span>
          </button>
          {isDoctor && (
            <button onClick={handleDeletePatient} className="btn btn-danger" style={{ width: '100%' }} disabled={deleteLoading}>
              <Trash2 size={16} /><span>{deleteLoading ? 'Deleting...' : 'Delete Patient Record'}</span>
            </button>
          )}
        </div>
      </section>

      {/* ─── RIGHT PANEL: CLINICAL HISTORY TIMELINE ─── */}
      <section className={styles.rightCard}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20 }}>
          Clinical Timeline History
          <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 12 }}>
            {visits.length} visit(s)
          </span>
        </h3>

        {error && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>}

        {visits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <HeartPulse size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No consultation records available for this patient.</p>
          </div>
        ) : (
          <div className={styles.visitList}>
            {visits.map((visit) => (
              <article key={visit.visit_id} className={styles.visitItem}>

                {/* ─── VISIT HEADER ─── */}
                <div className={styles.visitHeader}>
                  <h4 className={styles.diagnosis}>
                    {editingVisitId === visit.visit_id ? 'Editing Visit...' : `Diagnosis: ${visit.diagnosis}`}
                  </h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={styles.visitDate}>
                      {new Date(visit.visit_date).toLocaleDateString()} {new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isDoctor && editingVisitId !== visit.visit_id && (
                      <button className={styles.editBtn} onClick={() => startEdit(visit)} title="Edit this visit">
                        <Pencil size={14} />
                      </button>
                    )}
                    {isDoctor && editingVisitId === visit.visit_id && (
                      <button className={styles.cancelBtn} onClick={cancelEdit} title="Cancel editing">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ─── INLINE EDIT FORM ─── */}
                {editingVisitId === visit.visit_id ? (
                  <div className={styles.editForm}>
                    {editError && <div className="alert alert-danger" style={{ marginBottom: 12, padding: '8px 12px', fontSize: '0.82rem' }}>{editError}</div>}

                    <div className={styles.editGrid}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Diagnosis</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.diagnosis}
                          onChange={e => setEditForm({ ...editForm, diagnosis: e.target.value })}
                          disabled={editLoading}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Blood Pressure (SYS/DIA)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. 120/80"
                          value={editForm.blood_pressure}
                          onChange={e => setEditForm({ ...editForm, blood_pressure: e.target.value })}
                          disabled={editLoading}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Temperature (°F)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          placeholder="e.g. 98.6"
                          value={editForm.temperature}
                          onChange={e => setEditForm({ ...editForm, temperature: e.target.value })}
                          disabled={editLoading}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Blood Sugar</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. 110 mg/dL"
                          value={editForm.sugar}
                          onChange={e => setEditForm({ ...editForm, sugar: e.target.value })}
                          disabled={editLoading}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 10 }}>
                      <label>Physician Notes</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={editForm.notes}
                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                        disabled={editLoading}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-secondary" onClick={cancelEdit} disabled={editLoading}>
                        <X size={14} /> Cancel
                      </button>
                      <button className="btn btn-primary" onClick={() => handleSaveEdit(visit.visit_id)} disabled={editLoading}>
                        <Save size={14} /> {editLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ─── VITALS DISPLAY ─── */}
                    <div className={styles.vitalsGrid}>
                      <div><span className={styles.vitalLabel}>BP: </span><span className={styles.vitalValue}>{visit.blood_pressure || '-'}</span></div>
                      <div><span className={styles.vitalLabel}>Sugar: </span><span className={styles.vitalValue}>{parseSugar(visit.notes) ? `${parseSugar(visit.notes)} mg/dL` : '-'}</span></div>
                      <div><span className={styles.vitalLabel}>Temp: </span><span className={styles.vitalValue}>{visit.temperature ? `${visit.temperature}°F` : '-'}</span></div>
                    </div>

                    <div className={styles.notesArea}>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Notes &amp; Instructions:</strong>
                      {parseNotesOnly(visit.notes)}
                    </div>
                  </>
                )}

                {/* ─── PRESCRIPTIONS TABLE ─── */}
                {visit.prescriptions && visit.prescriptions.length > 0 && editingVisitId !== visit.visit_id && (
                  <div>
                    <h5 className={styles.prescriptionsTitle}>Prescribed Medicines</h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Medicine</th>
                          <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Dosage</th>
                          <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Duration</th>
                          <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Qty</th>
                          {isDoctor && <th style={{ padding: '8px', width: '40px' }}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visit.prescriptions.map((pres, pIdx) => (
                          <tr key={pres.prescription_id || pIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{(pres.medicine_name || '').toUpperCase()}</td>
                            <td style={{ padding: '8px' }}>{pres.dosage}</td>
                            <td style={{ padding: '8px' }}>{pres.duration_days ? `${pres.duration_days} days` : '-'}</td>
                            <td style={{ padding: '8px' }}><strong>{pres.quantity}</strong> units</td>
                            {isDoctor && (
                              <td style={{ padding: '8px' }}>
                                <button
                                  className={styles.deletePrescBtn}
                                  onClick={() => handleDeletePrescription(pres.prescription_id, pres.medicine_name)}
                                  disabled={deletingPrescId === pres.prescription_id}
                                  title="Remove this medicine from prescription (stock restored)"
                                >
                                  {deletingPrescId === pres.prescription_id ? '...' : <Trash2 size={13} />}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={isPatientModalOpen} onClose={() => setIsPatientModalOpen(false)} title="Edit Patient Information">
        <form onSubmit={handlePatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px' }}>
          {patientFormError && <div className="alert alert-danger" style={{ fontSize: '0.88rem' }}>{patientFormError}</div>}
          {patientFormSuccess && <div className="alert alert-success" style={{ fontSize: '0.88rem' }}>{patientFormSuccess}</div>}

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-dark)' }}>Patient Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. John Doe"
              value={patientForm.patient_name}
              onChange={e => setPatientForm({ ...patientForm, patient_name: e.target.value })}
              disabled={patientFormLoading}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-dark)' }}>Age *</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 35"
                value={patientForm.age}
                onChange={e => setPatientForm({ ...patientForm, age: e.target.value })}
                disabled={patientFormLoading}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-dark)' }}>Gender *</label>
              <select
                className="form-control"
                value={patientForm.gender}
                onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}
                disabled={patientFormLoading}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-dark)' }}>Phone Number * (10 Digits)</label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g. 9876543210"
              value={patientForm.phone_number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 10) {
                  setPatientForm({ ...patientForm, phone_number: val });
                }
              }}
              disabled={patientFormLoading}
              maxLength={10}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-dark)' }}>Home Address</label>
            <textarea
              className="form-control"
              placeholder="Patient full address"
              rows="2"
              value={patientForm.address}
              onChange={e => setPatientForm({ ...patientForm, address: e.target.value })}
              disabled={patientFormLoading}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsPatientModalOpen(false)} disabled={patientFormLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={patientFormLoading}>
              {patientFormLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientDetailPage;
