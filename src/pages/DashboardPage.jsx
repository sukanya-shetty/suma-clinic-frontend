import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Pill, 
  AlertTriangle, 
  UserPlus, 
  PlusCircle, 
  Calendar,
  Search,
  X,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { inventoryService } from '../services/inventoryService';
import { visitService } from '../services/visitService';
import { staffService } from '../services/staffService';
import { salesService } from '../services/salesService';
import { AuthContext } from '../context/AuthContext';
import StatCard from '../components/common/StatCard';
import Table from '../components/common/Table';
import styles from './DashboardPage.module.css';

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const isDoctor = user && user.role === 'Doctor';

  const [stats, setStats] = useState({
    todayPatients: 0,
    totalVisits: 0
  });
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();



  // ─── Patient Search State ───
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const [patientsRes, visitsRes, countRes] = await Promise.all([
        patientService.getAllPatients(),
        visitService.getRecentVisits(),
        visitService.getVisitsCount()
      ]);

      const patientsList = patientsRes.patients || patientsRes || [];
      const todayPatientsCount = patientsList.filter(p => {
        if (!p.registration_date) return false;
        return p.registration_date.startsWith(todayStr);
      }).length;

      setStats({
        todayPatients: todayPatientsCount,
        totalVisits: countRes.count || 0
      });

      const sortedPatients = [...patientsList].sort((a, b) => b.patient_id - a.patient_id);
      setRecentVisits(sortedPatients);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(`Failed to retrieve dashboard statistics (${errMsg}). Ensure WAMP and Node.js servers are running.`);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    loadDashboardData();
  }, [isDoctor, user]);

  // ─── Live Patient Search with Debounce ───
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const isNumeric = /^\d+$/.test(searchQuery.trim());
        const res = isNumeric
          ? await patientService.searchPatients({ phone: searchQuery.trim() })
          : await patientService.searchPatients({ name: searchQuery.trim() });
        setSearchResults(res.patients || []);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  // ─── Close dropdown when clicking outside ───
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = (patient) => {
    setSearchQuery('');
    setShowDropdown(false);
    navigate(`/patients/${patient.patient_id}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // ─── Recent Patients Table ───
  const recentVisitsHeaders = [
    { key: 'registration_date', label: 'Date Registered' },
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'phone_number', label: 'Phone Number' },
    { key: 'demographics', label: 'Age/Gender' },
    { key: 'actions', label: 'Actions' }
  ];

  const formatVisitDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const normalizedStr = typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(normalizedStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const renderVisitRow = (patient, index) => (
    <tr key={patient.patient_id || index}>
      <td>{formatVisitDate(patient.registration_date)}</td>
      <td>
        <span style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
          onClick={() => navigate(`/patients/${patient.patient_id}`)}>
          {patient.patient_name ? patient.patient_name.toUpperCase() : 'UNKNOWN'}
        </span>
      </td>
      <td>{patient.phone_number || '-'}</td>
      <td>{patient.age ? `${patient.age} yrs` : '-'} / {patient.gender || '-'}</td>
      <td>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => navigate(`/visits/new?patientId=${patient.patient_id}`)}
            className="btn btn-primary"
            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
          >
            Record Visit
          </button>
          <button 
            onClick={() => navigate(`/patients/${patient.patient_id}`)}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
          >
            View History
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className={styles.dashboardGrid}>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ─── STAT CARDS ─── */}
      <section className={styles.statsRow}>
        <StatCard title="Today's Patients" value={loading ? '...' : stats.todayPatients} icon={<Users size={20} />} color="var(--primary)" />
        <StatCard title="Total Consultation Visits" value={loading ? '...' : stats.totalVisits} icon={<Calendar size={20} />} color="var(--success)" />
      </section>

      {/* ─── QUICK ACTIONS ─── */}
      {user?.role !== 'Nurse' && (
        <section className={styles.quickActionsCard}>
          <h3 className={styles.sectionTitle}>Quick Operations</h3>
          <div className={styles.actionsRow}>
            <button className="btn btn-primary" onClick={() => navigate('/patients?openRegister=true')}>
              <UserPlus size={16} /><span>New Patient Registration</span>
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/visits/new')}>
              <PlusCircle size={16} /><span>Record Consultation Visit</span>
            </button>
          </div>
        </section>
      )}

      {/* ─── FULL-WIDTH PATIENT SEARCH ─── */}
      {user?.role !== 'Pharmacist' && (
        <section className={styles.searchCard}>
          <div ref={searchRef} className={styles.searchWrapper}>
            <div className={styles.searchInputBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search patient by name or phone number to view their history..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              />
              {searchLoading && (
                <span className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--primary)', flexShrink: 0 }}></span>
              )}
              {searchQuery && !searchLoading && (
                <button onClick={clearSearch} className={styles.clearBtn} title="Clear">
                  <X size={14} />
                </button>
              )}
            </div>

            {showDropdown && (
              <ul className={styles.searchDropdown}>
                {searchResults.length === 0 ? (
                  <li className={styles.noResult}>No patient found for "{searchQuery}"</li>
                ) : (
                  searchResults.map(p => (
                    <li key={p.patient_id} className={styles.dropdownItem} onClick={() => handleSelectPatient(p)}>
                      <div className={styles.dropdownName}>{(p.patient_name || '').toUpperCase()}</div>
                      <div className={styles.dropdownMeta}>
                        {p.age ? `${p.age} yrs` : ''}{p.gender ? ` · ${p.gender}` : ''}{p.phone_number ? ` · 📞 ${p.phone_number}` : ''}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ─── RECENTLY REGISTERED PATIENTS (FULL WIDTH) ─── */}
      <section className={styles.recentVisitsCard}>
        <div className={styles.tableHeader}>
          <h3 className={styles.sectionTitle}>Recently Registered Patients</h3>
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
            emptyMessage="No patients registered recently."
          />
        )}
      </section>


    </div>
  );
};

export default DashboardPage;
