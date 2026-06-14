import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, CalendarRange, HeartPulse, User } from 'lucide-react';
import { patientService } from '../services/patientService';
import { AuthContext } from '../context/AuthContext';
import Table from '../components/common/Table';
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

  const handleDeletePatient = async () => {
    if (!window.confirm('WARNING: Deleting this patient will permanently erase their entire clinical visit history and prescriptions. Proceed?')) {
      return;
    }

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

  // Helper functions for parsing packed notes
  const parseSugar = (notes) => {
    if (!notes) return '-';
    const match = notes.match(/Blood Sugar:\s*([\d\w/]+)/i);
    return match ? `${match[1]} mg/dL` : '-';
  };

  const parseNotesOnly = (notes) => {
    if (!notes) return '-';
    const parts = notes.split(/\|\s*Notes:\s*/i);
    if (parts.length > 1) return parts[1].trim();
    
    // Check older formats
    if (notes.startsWith('Blood Sugar:')) {
      const notesIndex = notes.toLowerCase().indexOf('notes:');
      if (notesIndex > -1) {
        return notes.substring(notesIndex + 6).trim();
      }
      return '-';
    }
    return notes;
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
          <div className={styles.avatar}>
            <User size={32} />
          </div>
          <h3 className={styles.patientName}>{patient.patient_name ? patient.patient_name.toUpperCase() : 'UNKNOWN'}</h3>
          <span className={styles.patientRole}>Patient ID: #{patient.patient_id}</span>
        </div>

        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Age</span>
            <span className={styles.infoValue}>{patient.age} years</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Gender</span>
            <span className={styles.infoValue}>{patient.gender}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Phone Number</span>
            <span className={styles.infoValue}>{patient.phone_number || 'N/A'}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Home Address</span>
            <span className={styles.infoValue}>{patient.address || 'N/A'}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Registered On</span>
            <span className={styles.infoValue}>{patient.registration_date ? new Date(patient.registration_date).toLocaleDateString() : '-'}</span>
          </div>
        </div>

        <div className={styles.actionPanel}>
          <button 
            onClick={() => navigate(`/visits/new?patientId=${patient.patient_id}`)}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            <CalendarRange size={16} />
            <span>Record New Visit</span>
          </button>

          {isDoctor && (
            <button 
              onClick={handleDeletePatient}
              className="btn btn-danger"
              style={{ width: '100%' }}
              disabled={deleteLoading}
            >
              <Trash2 size={16} />
              <span>{deleteLoading ? 'Deleting...' : 'Delete Record'}</span>
            </button>
          )}
        </div>
      </section>

      {/* ─── RIGHT SIDEBAR PANEL: TIMELINE CLINICAL HISTORY ─── */}
      <section className={styles.rightCard}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20 }}>Clinical Timeline History</h3>

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
                <div className={styles.visitHeader}>
                  <h4 className={styles.diagnosis}>Diagnosis: {visit.diagnosis}</h4>
                  <span className={styles.visitDate}>
                    {new Date(visit.visit_date).toLocaleDateString()} {new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className={styles.vitalsGrid}>
                  <div>
                    <span className={styles.vitalLabel}>BP: </span>
                    <span className={styles.vitalValue}>{visit.blood_pressure || '-'}</span>
                  </div>
                  <div>
                    <span className={styles.vitalLabel}>Sugar: </span>
                    <span className={styles.vitalValue}>{parseSugar(visit.notes)}</span>
                  </div>
                  <div>
                    <span className={styles.vitalLabel}>Temp: </span>
                    <span className={styles.vitalValue}>{visit.temperature ? `${visit.temperature}°F` : '-'}</span>
                  </div>
                </div>

                <div className={styles.notesArea}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Notes & Instructions:</strong>
                  {parseNotesOnly(visit.notes)}
                </div>

                {visit.prescriptions && visit.prescriptions.length > 0 && (
                  <div>
                    <h5 className={styles.prescriptionsTitle}>Prescribed Medicines</h5>
                    <Table 
                      headers={[
                        { key: 'medicine_name', label: 'Medicine Name' },
                        { key: 'dosage', label: 'Dosage' },
                        { key: 'duration_days', label: 'Duration' },
                        { key: 'quantity', label: 'Qty' }
                      ]}
                      data={visit.prescriptions}
                      renderRow={(pres, pIdx) => (
                        <tr key={pres.prescription_id || pIdx}>
                          <td style={{ fontWeight: 600 }}>{pres.medicine_name.toUpperCase()}</td>
                          <td>{pres.dosage}</td>
                          <td>{pres.duration_days ? `${pres.duration_days} days` : '-'}</td>
                          <td><strong>{pres.quantity}</strong> units</td>
                        </tr>
                      )}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PatientDetailPage;
