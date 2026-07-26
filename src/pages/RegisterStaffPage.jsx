import React, { useState, useEffect, useContext } from 'react';
import { ShieldCheck, UserPlus, UserCheck, Trash2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { staffService } from '../services/staffService';
import { AuthContext } from '../context/AuthContext';
import styles from './RegisterStaffPage.module.css';

const RegisterStaffPage = () => {
  const { user } = useContext(AuthContext);
  const isDoctor = user && user.role === 'Doctor';

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
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loadStaffList = async () => {
    setLoading(true);
    try {
      const res = await staffService.getAllStaff();
      setStaffList(res.staff || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
      setStaffError('Failed to retrieve active staff roster. Ensure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDoctor) {
      loadStaffList();
    }
  }, [isDoctor]);

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

  if (!isDoctor) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: 'var(--danger)', marginBottom: 16 }} />
        <h3>Access Denied</h3>
        <p>You must have Doctor privileges to manage staff accounts.</p>
      </div>
    );
  }

  return (
    <div className={styles.registerStaffContainer}>
      <div className={styles.staffManagementCard}>
        <div className={styles.panelHeader}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <ShieldCheck size={20} style={{ color: 'var(--success)' }} />
            <span>Staff Account Management</span>
          </h3>
          <span className={styles.badgeCount}>
            {loading ? '...' : `${staffList.length} Registered`}
          </span>
        </div>

        {staffError && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{staffError}</div>}
        {staffSuccess && <div className="alert alert-success" style={{ marginBottom: 20 }}>{staffSuccess}</div>}

        <div className={styles.staffGrid}>
          {/* Form */}
          <form onSubmit={handleAddStaff} className={styles.staffForm}>
            <h4 className={styles.formSubtitle}>Register New Staff Member</h4>
            
            <div className={styles.formRow} style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className={styles.inputLabel}>Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mr. Abs"
                  value={staffForm.name}
                  onChange={e => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={staffSubmitLoading}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className={styles.inputLabel}>Role *</label>
                <select
                  className="form-control"
                  value={staffForm.role}
                  onChange={e => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                  disabled={staffSubmitLoading}
                  required
                >
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Nurse">Nurse</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className={styles.inputLabel}>Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder="dr.shetty@clinic.com"
                value={staffForm.email}
                onChange={e => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                disabled={staffSubmitLoading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className={styles.inputLabel}>Phone Number * (10 Digits)</label>
              <input
                type="tel"
                className="form-control"
                placeholder="10-digit number"
                value={staffForm.phoneNumber}
                onChange={handlePhoneChange}
                disabled={staffSubmitLoading}
                required
              />
            </div>

            <div className={styles.formRow} style={{ marginBottom: 24 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className={styles.inputLabel}>Password *</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={staffForm.password}
                    onChange={e => setStaffForm(prev => ({ ...prev, password: e.target.value }))}
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className={styles.inputLabel}>Confirm Password *</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={staffForm.confirmPassword}
                    onChange={e => setStaffForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading staff roster...
              </div>
            ) : staffList.length === 0 ? (
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
      </div>
    </div>
  );
};

export default RegisterStaffPage;
