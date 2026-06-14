import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Pill, 
  AlertTriangle, 
  DollarSign, 
  UserPlus, 
  PlusCircle, 
  Calendar,
  CalendarDays
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { inventoryService } from '../services/inventoryService';
import { salesService } from '../services/salesService';
import { visitService } from '../services/visitService';
import StatCard from '../components/common/StatCard';
import Table from '../components/common/Table';
import styles from './DashboardPage.module.css';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    todayPatients: 0,
    totalMeds: 0,
    expiringAlerts: 0,
    todaySales: 0
  });
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch patient, medicine, expiring, sales, and visit lists in parallel
      const [patientsRes, medsRes, expiringRes, salesRes, visitsRes] = await Promise.all([
        patientService.getAllPatients(),
        inventoryService.getAllMedicines(),
        inventoryService.getExpiringMedicines(),
        salesService.getDailySalesSummary(),
        visitService.getRecentVisits()
      ]);

      const patientsList = patientsRes.patients || patientsRes || [];
      const todayPatientsCount = patientsList.filter(p => {
        if (!p.registration_date) return false;
        // registration_date can be in formats: "2026-06-11T..." or "2026-06-11"
        return p.registration_date.startsWith(todayStr);
      }).length;

      setStats({
        todayPatients: todayPatientsCount,
        totalMeds: (medsRes.medicines || medsRes || []).length,
        expiringAlerts: (expiringRes.medicines || expiringRes || []).length,
        todaySales: salesRes.summary?.totalSales || 0
      });

      setRecentVisits(visitsRes.visits || []);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setError('Failed to retrieve dashboard statistics. Ensure WAMP and Node.js servers are running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const recentVisitsHeaders = [
    { key: 'visit_date', label: 'Date' },
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'blood_pressure', label: 'BP Vitals' },
    { key: 'temperature', label: 'Temp (°F)' },
    { key: 'actions', label: 'Actions' }
  ];

  const formatVisitDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const renderVisitRow = (visit, index) => {
    return (
      <tr key={visit.visit_id || index}>
        <td>{formatVisitDate(visit.visit_date)}</td>
        <td>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            {visit.patient_name ? visit.patient_name.toUpperCase() : 'UNKNOWN'}
          </span>
        </td>
        <td>{visit.diagnosis || '-'}</td>
        <td>{visit.blood_pressure || '-'}</td>
        <td>{visit.temperature ? `${visit.temperature}°F` : '-'}</td>
        <td>
          <button 
            onClick={() => navigate(`/patients/${visit.patient_id}`)}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
          >
            View History
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.dashboardGrid}>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ─── 4 STAT CARDS ─── */}
      <section className={styles.statsRow}>
        <StatCard 
          title="Today's Patients" 
          value={loading ? '...' : stats.todayPatients} 
          icon={<Users size={20} />} 
          color="var(--primary)" 
        />
        <StatCard 
          title="Total Medicines" 
          value={loading ? '...' : stats.totalMeds} 
          icon={<Pill size={20} />} 
          color="var(--success)" 
        />
        <StatCard 
          title="Near-Expiry Alerts" 
          value={loading ? '...' : stats.expiringAlerts} 
          icon={<AlertTriangle size={20} />} 
          color="var(--warning)" 
        />
        <StatCard 
          title="Today's Revenue" 
          value={loading ? '...' : `$${parseFloat(stats.todaySales).toFixed(2)}`} 
          icon={<DollarSign size={20} />} 
          color="var(--primary-light)" 
        />
      </section>

      {/* ─── QUICK ACTIONS ─── */}
      <section className={styles.quickActionsCard}>
        <h3 className={styles.sectionTitle}>Quick Operations</h3>
        <div className={styles.actionsRow}>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/patients?openRegister=true')}
          >
            <UserPlus size={16} />
            <span>New Patient Registration</span>
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/visits/new')}
          >
            <PlusCircle size={16} />
            <span>Record Consultation Visit</span>
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/inventory?openAdd=true')}
          >
            <Calendar size={16} />
            <span>Replenish Store Catalog</span>
          </button>
        </div>
      </section>

      {/* ─── RECENT VISITS ─── */}
      <section className={styles.recentVisitsCard}>
        <div className={styles.tableHeader}>
          <h3 className={styles.sectionTitle}>Recent Consultations</h3>
          <button 
            onClick={() => navigate('/patients')} 
            className={styles.viewAllLink}
          >
            Search Patient Directory
          </button>
        </div>

        {loading ? (
          <div className="loading-inline" style={{ padding: '24px 0' }}>
            <span className="spinner"></span> Loading consultations...
          </div>
        ) : (
          <Table 
            headers={recentVisitsHeaders} 
            data={recentVisits} 
            renderRow={renderVisitRow} 
            emptyMessage="No consultations recorded recently." 
          />
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
