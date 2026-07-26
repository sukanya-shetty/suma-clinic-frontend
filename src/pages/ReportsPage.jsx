import React, { useState, useEffect, useContext } from 'react';
import { BarChart2, Users, RefreshCw, UserCheck } from 'lucide-react';
import { patientService } from '../services/patientService';
import { AuthContext } from '../context/AuthContext';
import StatCard from '../components/common/StatCard';
import Table from '../components/common/Table';
import styles from './ReportsPage.module.css';

const ReportsPage = () => {
  const { user } = useContext(AuthContext);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await patientService.getAllPatients();
      setPatients(res.patients || res || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load patient report data. Ensure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    loadReports();
  };

  // ─── Filter Patients by Registration Date Range ───
  const filteredPatients = patients.filter(p => {
    if (!p.registration_date) return false;
    const regDate = p.registration_date.split(' ')[0]; // YYYY-MM-DD
    return regDate >= startDate && regDate <= endDate;
  });

  // ─── Demographic Breakdown ───
  let maleCount = 0;
  let femaleCount = 0;
  let otherCount = 0;

  filteredPatients.forEach(p => {
    const gender = (p.gender || '').toLowerCase();
    if (gender === 'male') maleCount++;
    else if (gender === 'female') femaleCount++;
    else otherCount++;
  });

  const totalFiltered = filteredPatients.length;
  const getPercentage = (count) => {
    if (totalFiltered === 0) return '0%';
    return `${Math.round((count / totalFiltered) * 100)}%`;
  };

  const patientHeaders = [
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'registration_date', label: 'Registration Date' }
  ];

  const renderPatientRow = (patient, idx) => (
    <tr key={patient.patient_id || idx}>
      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
        {(patient.patient_name || '').toUpperCase()}
      </td>
      <td>{patient.phone_number || '-'}</td>
      <td>{patient.age} yrs</td>
      <td>{patient.gender}</td>
      <td>
        {patient.registration_date ? new Date(patient.registration_date).toLocaleDateString() : '-'}
      </td>
    </tr>
  );

  return (
    <div className={styles.reportsContainer}>
      {/* ─── PAGE HEADER ─── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>
            <BarChart2 size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Clinic Patient Reports
          </h2>
          <p className={styles.pageSubtitle}>Operational summaries for registered patients and demographic history.</p>
        </div>
      </div>

      {/* ─── DATE FILTER ─── */}
      <form onSubmit={handleFilter} className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="rep_start">From Date</label>
          <input
            type="date"
            id="rep_start"
            className="form-control"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="rep_end">To Date</label>
          <input
            type="date"
            id="rep_end"
            className="form-control"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-end' }}>
          <RefreshCw size={15} />
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ─── KPI STAT CARDS ─── */}
      {!loading && (
        <>
          <section className={styles.statsGrid}>
            <StatCard
              title="Total Registered Patients"
              value={patients.length}
              icon={<Users size={20} />}
              color="var(--success)"
            />
            <StatCard
              title="New Registrations (This Period)"
              value={totalFiltered}
              icon={<UserCheck size={20} />}
              color="var(--primary)"
            />
          </section>

          {/* ─── DEMOGRAPHIC BREAKDOWN ─── */}
          <section className={styles.breakdownGrid}>
            <div className={styles.breakdownCard} style={{ gridColumn: 'span 2' }}>
              <h4 className={styles.cardTitle}>Gender Distribution (This Period)</h4>
              <div className={styles.breakdownRows}>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Male</span>
                  <span className={styles.breakdownValue}>
                    {maleCount} ({getPercentage(maleCount)})
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Female</span>
                  <span className={styles.breakdownValue}>
                    {femaleCount} ({getPercentage(femaleCount)})
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Other / Unspecified</span>
                  <span className={styles.breakdownValue}>
                    {otherCount} ({getPercentage(otherCount)})
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ─── PATIENT REGISTRATION TABLE ─── */}
          <section className={styles.tableSection}>
            <h4 className={styles.tableSectionTitle}>Patients Registered in Selected Period</h4>
            {filteredPatients.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No patient registrations found for the selected date range.
              </div>
            ) : (
              <Table
                headers={patientHeaders}
                data={filteredPatients}
                renderRow={renderPatientRow}
                emptyMessage="No patient registrations for this period."
              />
            )}
          </section>
        </>
      )}

      {loading && (
        <div className="loading-inline" style={{ padding: '48px', justifyContent: 'center' }}>
          <span className="spinner"></span> Compiling patient report data...
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
