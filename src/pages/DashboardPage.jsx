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
    todayDispensing: 0,
    totalMeds: 0,
    lowStockAlerts: 0,
    expiringAlerts: 0
  });
  const [lowStockMedsList, setLowStockMedsList] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [recentWalkInSales, setRecentWalkInSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // ─── Staff Account Management States ───
  const [staffList, setStaffList] = useState([]);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'Pharmacist'
  });
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffSubmitLoading, setStaffSubmitLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

      if (user && user.role === 'Pharmacist') {
        const [medsRes, expiringRes, salesRes, prescriptionsRes] = await Promise.all([
          inventoryService.getAllMedicines(),
          inventoryService.getExpiringMedicines(),
          salesService.getAllSales({ sale_type: 'Direct Walk-in' }),
          visitService.getRecentPrescriptions()
        ]);

        const medicinesList = medsRes.medicines || medsRes || [];
        const lowStockMeds = medicinesList.filter(m => m.quantity < 10);
        const lowStockNames = lowStockMeds.map(m => m.medicine_name.toUpperCase());

        const walkInSalesList = salesRes.sales || salesRes || [];
        const todayDispensingCount = walkInSalesList.filter(s => {
          if (!s.sale_date) return false;
          return s.sale_date.startsWith(todayStr);
        }).length;

        setStats({
          todayPatients: 0,
          todayDispensing: todayDispensingCount,
          totalMeds: medicinesList.length,
          lowStockAlerts: lowStockMeds.length,
          expiringAlerts: (expiringRes.medicines || expiringRes || []).length
        });

        setLowStockMedsList(lowStockNames);
        setRecentWalkInSales(walkInSalesList);
        setRecentPrescriptions(prescriptionsRes.prescriptions || []);
      } else {
        const [patientsRes, medsRes, expiringRes, visitsRes] = await Promise.all([
          patientService.getAllPatients(),
          inventoryService.getAllMedicines(),
          inventoryService.getExpiringMedicines(),
          visitService.getRecentVisits()
        ]);

        const patientsList = patientsRes.patients || patientsRes || [];
        const todayPatientsCount = patientsList.filter(p => {
          if (!p.registration_date) return false;
          return p.registration_date.startsWith(todayStr);
        }).length;

        const medicinesList = medsRes.medicines || medsRes || [];
        const lowStockMeds = medicinesList.filter(m => m.quantity < 10);
        const lowStockNames = lowStockMeds.map(m => m.medicine_name.toUpperCase());

        setStats({
          todayPatients: todayPatientsCount,
          todayDispensing: 0,
          totalMeds: medicinesList.length,
          lowStockAlerts: lowStockMeds.length,
          expiringAlerts: (expiringRes.medicines || expiringRes || []).length
        });

        setLowStockMedsList(lowStockNames);
        setRecentVisits(visitsRes.visits || []);

        if (isDoctor) {
          await loadStaffList();
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(`Failed to retrieve dashboard statistics (${errMsg}). Ensure WAMP and Node.js servers are running.`);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffList = async () => {
    try {
      const res = await staffService.getAllStaff();
      setStaffList(res.staff || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); // numeric only
    if (val.length <= 10) {
      setStaffForm(prev => ({ ...prev, phoneNumber: val }));
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');

    const { name, email, phoneNumber, password, confirmPassword, role } = staffForm;

    if (!name || !email || !phoneNumber || !password || !confirmPassword || !role) {
      setStaffError('Please fill in all fields.');
      return;
    }

    if (phoneNumber.length !== 10) {
      setStaffError('Phone number must be exactly 10 digits.');
      return;
    }

    if (password !== confirmPassword) {
      setStaffError('Passwords do not match.');
      return;
    }

    setStaffSubmitLoading(true);
    try {
      const response = await staffService.addStaff(staffForm);
      if (response.success) {
        setStaffSuccess('Staff account created successfully!');
        setStaffForm({
          name: '',
          email: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          role: 'Pharmacist'
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
        await loadStaffList();
      }
    } catch (err) {
      console.error(err);
      setStaffError(err.response?.data?.message || err.response?.data?.error || 'Failed to add staff member.');
    } finally {
      setStaffSubmitLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId, staffName, staffRole) => {
    const confirmed = window.confirm(`Are you absolutely sure you want to delete the ${staffRole} "${staffName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setStaffError('');
      setStaffSuccess('');
      const response = await staffService.deleteStaff(staffId);
      if (response.success) {
        setStaffSuccess(`${staffRole} "${staffName}" was successfully deleted.`);
        await loadStaffList();
      }
    } catch (err) {
      console.error(err);
      setStaffError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete staff member.');
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

  // ─── Recent Visits Table ───
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
      const normalizedStr = typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(normalizedStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const renderVisitRow = (visit, index) => (
    <tr key={visit.visit_id || index}>
      <td>{formatVisitDate(visit.visit_date)}</td>
      <td>
        <span style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
          onClick={() => navigate(`/patients/${visit.patient_id}`)}>
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

  return (
    <div className={styles.dashboardGrid}>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ─── LOW STOCK NOTIFICATION BANNER ─── */}
      {!loading && lowStockMedsList.length > 0 && (
        <div className={styles.lowStockBanner}>
          <div className={styles.alertIcon}><AlertTriangle size={20} /></div>
          <div className={styles.alertContent}>
            <span className={styles.alertTitle}>Immediate Attention Required: Low Stock Medicines</span>
            <span className={styles.alertDesc}>
              The following medicines have less than 10 units in inventory and need restocking: <strong>{lowStockMedsList.join(', ')}</strong>
            </span>
          </div>
          <button className={styles.bannerBtn} onClick={() => navigate('/inventory')}>
            Go to Inventory
          </button>
        </div>
      )}

      {/* ─── 4 STAT CARDS ─── */}
      <section className={styles.statsRow}>
        {user?.role === 'Pharmacist' ? (
          <StatCard title="Today's Dispensing" value={loading ? '...' : stats.todayDispensing} icon={<Pill size={20} />} color="var(--primary)" />
        ) : (
          <StatCard title="Today's Patients" value={loading ? '...' : stats.todayPatients} icon={<Users size={20} />} color="var(--primary)" />
        )}
        <StatCard title="Total Medicines" value={loading ? '...' : stats.totalMeds} icon={<Pill size={20} />} color="var(--success)" />
        <StatCard title="Low Stock Alerts" value={loading ? '...' : stats.lowStockAlerts} icon={<AlertTriangle size={20} />} color="var(--danger)" />
        <StatCard title="Near-Expiry Alerts" value={loading ? '...' : stats.expiringAlerts} icon={<AlertTriangle size={20} />} color="var(--warning)" />
      </section>

      {/* ─── QUICK ACTIONS ─── */}
      {user?.role !== 'Nurse' && (
        <section className={styles.quickActionsCard}>
          <h3 className={styles.sectionTitle}>Quick Operations</h3>
          <div className={styles.actionsRow}>
            {user?.role === 'Pharmacist' ? (
              <button className="btn btn-primary" onClick={() => navigate('/sales/walkin')}>
                <PlusCircle size={16} /><span>Direct Medicine Dispensing</span>
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/patients?openRegister=true')}>
                  <UserPlus size={16} /><span>New Patient Registration</span>
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/visits/new')}>
                  <PlusCircle size={16} /><span>Record Consultation Visit</span>
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/inventory?openAdd=true')}>
                  <Calendar size={16} /><span>Replenish Store Catalog</span>
                </button>
              </>
            )}
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

      {/* ─── RECENT VISITS / PHARMACIST DEDUCTIONS & WALK-IN TABLES ─── */}
      {user?.role === 'Pharmacist' ? (
        <div className={styles.pharmacistTablesRow}>
          {/* Recent Walk-in Sales Table */}
          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Recent Walk-in Sales</h3>
            </div>
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading sales...
              </div>
            ) : (
              <Table
                headers={[
                  { key: 'sale_date', label: 'Date' },
                  { key: 'medicine_name', label: 'Medicine' },
                  { key: 'quantity_sold', label: 'Qty' }
                ]}
                data={recentWalkInSales.slice(0, 10)}
                renderRow={(sale, index) => (
                  <tr key={sale.sale_id || index}>
                    <td>{formatVisitDate(sale.sale_date)}</td>
                    <td style={{ fontWeight: 600 }}>{(sale.medicine_name || '').toUpperCase()}</td>
                    <td>{sale.quantity_sold} units</td>
                  </tr>
                )}
                emptyMessage="No walk-in sales recorded recently."
              />
            )}
          </section>

          {/* Recent Doctor Deductions Table */}
          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Recent Doctor Deductions</h3>
            </div>
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading deductions...
              </div>
            ) : (
              <Table
                headers={[
                  { key: 'created_at', label: 'Date' },
                  { key: 'patient_name', label: 'Patient Name' },
                  { key: 'medicine_name', label: 'Medicine' },
                  { key: 'qty', label: 'Qty' },
                  { key: 'dosage', label: 'Dosage' }
                ]}
                data={recentPrescriptions.slice(0, 10)}
                renderRow={(presc, index) => (
                  <tr key={presc.prescription_id || index}>
                    <td>{formatVisitDate(presc.created_at || presc.visit_date)}</td>
                    <td>
                      <span 
                        style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                        onClick={() => presc.patient_id && navigate(`/patients/${presc.patient_id}`)}
                      >
                        {presc.patient_name ? presc.patient_name.toUpperCase() : 'UNKNOWN'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{(presc.medicine_name || '').toUpperCase()}</td>
                    <td>{presc.quantity} units</td>
                    <td>{presc.dosage || '-'}</td>
                  </tr>
                )}
                emptyMessage="No doctor prescriptions found."
              />
            )}
          </section>
        </div>
      ) : (
        <section className={styles.recentVisitsCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.sectionTitle}>Recent Consultations</h3>
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
      )}

      {/* ─── STAFF MANAGEMENT PANEL (DOCTOR ONLY) ─── */}
      {isDoctor && (
        <section id="staff-management-section" className={styles.staffManagementCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--primary)' }} />
              <span>Staff Account Management</span>
            </h3>
            <span className={styles.badgeCount}>
              {staffList.length} Registered
            </span>
          </div>

          <div className={styles.staffGrid}>
            {/* Form */}
            <form onSubmit={handleAddStaff} className={styles.staffForm}>
              <h4 className={styles.formSubtitle}>Register New Staff Member</h4>
              
              {staffError && <div className="alert alert-danger" style={{ fontSize: '0.85rem', padding: '8px 12px', marginBottom: 12 }}>{staffError}</div>}
              {staffSuccess && <div className="alert alert-success" style={{ fontSize: '0.85rem', padding: '8px 12px', marginBottom: 12 }}>{staffSuccess}</div>}

              <div className={styles.formRow}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="staffName" className={styles.inputLabel}>Full Name *</label>
                  <input
                    type="text"
                    id="staffName"
                    className="form-control"
                    placeholder="e.g. Mr. Abs"
                    value={staffForm.name}
                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                    disabled={staffSubmitLoading}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="staffRole" className={styles.inputLabel}>Role *</label>
                  <select
                    id="staffRole"
                    className="form-control"
                    value={staffForm.role}
                    onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                    disabled={staffSubmitLoading}
                    required
                  >
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Nurse">Nurse</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="staffEmail" className={styles.inputLabel}>Email Address *</label>
                <input
                  type="email"
                  id="staffEmail"
                  className="form-control"
                  placeholder="e.g. staff@clinic.com"
                  value={staffForm.email}
                  onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                  disabled={staffSubmitLoading}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="staffPhone" className={styles.inputLabel}>Phone Number * (10 Digits)</label>
                <input
                  type="tel"
                  id="staffPhone"
                  className="form-control"
                  placeholder="10-digit number"
                  value={staffForm.phoneNumber}
                  onChange={handlePhoneChange}
                  disabled={staffSubmitLoading}
                  maxLength={10}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label htmlFor="staffPassword" className={styles.inputLabel}>Password *</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="staffPassword"
                      className="form-control"
                      placeholder="••••••••"
                      value={staffForm.password}
                      onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                      disabled={staffSubmitLoading}
                      required
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label htmlFor="staffConfirmPassword" className={styles.inputLabel}>Confirm Password *</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="staffConfirmPassword"
                      className="form-control"
                      placeholder="••••••••"
                      value={staffForm.confirmPassword}
                      onChange={e => setStaffForm({ ...staffForm, confirmPassword: e.target.value })}
                      disabled={staffSubmitLoading}
                      required
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={staffSubmitLoading}>
                <UserPlus size={16} />
                <span>{staffSubmitLoading ? 'Registering Staff...' : 'Add Staff Account'}</span>
              </button>
            </form>

            {/* List */}
            <div className={styles.staffListContainer}>
              <h4 className={styles.formSubtitle}>Registered Staff Roster ({staffList.length})</h4>
              {staffList.length === 0 ? (
                <div className={styles.noStaff}>No staff accounts registered yet.</div>
              ) : (
                <div className={styles.staffListWrapper}>
                  <ul className={styles.staffList}>
                    {staffList.map(s => (
                      <li key={s.staff_id} className={styles.staffItem}>
                        <div className={styles.staffItemIcon}>
                          <UserCheck size={16} />
                        </div>
                        <div className={styles.staffItemDetails}>
                          <div className={styles.staffItemName}>{s.name.toUpperCase()}</div>
                          <div className={styles.staffItemRole}>
                            <span className={styles.roleBadge}>{s.role}</span>
                            <span className={styles.divider}>•</span>
                            <span>{s.phone_number}</span>
                          </div>
                          <div className={styles.staffItemEmail}>{s.email}</div>
                        </div>
                        <button
                          type="button"
                          className={styles.deleteStaffBtn}
                          onClick={() => handleDeleteStaff(s.staff_id, s.name, s.role)}
                          title={`Delete ${s.role}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardPage;
