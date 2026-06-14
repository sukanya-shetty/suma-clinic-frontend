import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Pill, 
  AlertTriangle, 
  Calendar,
  UserPlus,
  ShieldCheck,
  UserCheck,
  TrendingUp,
  Inbox
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const userRole = localStorage.getItem('role') || 'Staff';
  
  // 1. Dashboard metrics states
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    totalMeds: 0,
    lowStockCount: 0,
    expiringCount: 0
  });

  // 2. Feeds and lists states
  const [alerts, setAlerts] = useState([]);
  const [expiringMeds, setExpiringMeds] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 3. Add Staff Form States (Doctor-only)
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

  // 4. Fetch dashboard info
  const fetchDashboardData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // Fetch Patients, Medicines, Alerts, and Staff lists in parallel
      const [patientsRes, medsRes, alertsRes, expiringRes, staffRes] = await Promise.all([
        axios.get('http://127.0.0.1:3001/api/patients', authHeaders),
        axios.get('http://127.0.0.1:3001/api/inventory/medicines', authHeaders),
        axios.get('http://127.0.0.1:3001/api/inventory/alerts', authHeaders),
        axios.get('http://127.0.0.1:3001/api/inventory/expiring', authHeaders),
        userRole === 'Doctor' ? axios.get('http://127.0.0.1:3001/api/staff/all', authHeaders) : Promise.resolve({ data: { staff: [] } })
      ]);

      const medicinesList = medsRes.data.medicines || [];
      const lowStockMeds = medicinesList.filter(m => m.quantity < 10);

      setMetrics({
        totalPatients: patientsRes.data.total || 0,
        totalMeds: medicinesList.length,
        lowStockCount: lowStockMeds.length,
        expiringCount: expiringRes.data.total || 0
      });

      setAlerts(alertsRes.data.alerts || []);
      setExpiringMeds(expiringRes.data.medicines || []);
      setStaffList(staffRes.data.staff || []);

    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 5. Handle add staff submit (Doctor-only)
  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');

    const { name, email, phoneNumber, password, confirmPassword, role } = staffForm;

    if (!name || !email || !phoneNumber || !password || !confirmPassword) {
      setStaffError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setStaffError('Passwords do not match.');
      return;
    }

    setStaffSubmitLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        'http://127.0.0.1:3001/api/staff/add-staff',
        staffForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 201) {
        setStaffSuccess('Staff member registered successfully!');
        setStaffForm({
          name: '',
          email: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          role: 'Pharmacist'
        });
        // Refresh staff list
        fetchDashboardData();
      }
    } catch (err) {
      setStaffError(err.response?.data?.message || 'Failed to add staff member.');
    } finally {
      setStaffSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <span className="spinner"></span>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid animate-fade-in">
      
      {/* ─── ROW 1: METRICS WIDGETS ─── */}
      <section className="metrics-row">
        
        {/* Card 1: Total Patients */}
        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">Total Patients</span>
            <div className="metric-icon-box blue">
              <Users size={20} />
            </div>
          </div>
          <p className="metric-number">{metrics.totalPatients}</p>
          <p className="metric-trend green">
            <TrendingUp size={14} /> Registered in clinic
          </p>
        </div>

        {/* Card 2: Inventory Items */}
        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">Medicines Catalog</span>
            <div className="metric-icon-box green">
              <Pill size={20} />
            </div>
          </div>
          <p className="metric-number">{metrics.totalMeds}</p>
          <p className="metric-trend">Stocked pharmacy list</p>
        </div>

        {/* Card 3: Low Stock Warnings */}
        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">Low Stock Alerts</span>
            <div className="metric-icon-box orange">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className={`metric-number ${metrics.lowStockCount > 0 ? 'text-warn' : ''}`}>
            {metrics.lowStockCount}
          </p>
          <p className="metric-trend">Quantity below 10 units</p>
        </div>

        {/* Card 4: Expiring Items */}
        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">Near Expiry</span>
            <div className="metric-icon-box red">
              <Calendar size={20} />
            </div>
          </div>
          <p className={`metric-number ${metrics.expiringCount > 0 ? 'text-danger' : ''}`}>
            {metrics.expiringCount}
          </p>
          <p className="metric-trend">Expires within 30 days</p>
        </div>

      </section>

      {/* ─── ROW 2: FEEDS AND CRITICAL ALERTS ─── */}
      <section className="dashboard-content-split">
        
        {/* Left Column: Live Alerts & Expiry Tracking */}
        <div className="dashboard-column glass-card">
          <div className="panel-header">
            <h3>Critical System Alerts</h3>
            <span className="badge-count red">{alerts.length}</span>
          </div>

          <div className="alerts-feed-container">
            {alerts.length === 0 ? (
              <div className="feed-empty">
                <Inbox size={32} className="empty-icon" />
                <p>No active alerts. All stock parameters are normal! ✅</p>
              </div>
            ) : (
              <ul className="alerts-feed">
                {alerts.map((alert) => (
                  <li key={alert.alert_id} className={`alert-item ${alert.alert_type.toLowerCase()}`}>
                    <AlertTriangle size={18} className="feed-alert-icon" />
                    <div className="alert-content">
                      <p className="alert-msg">{alert.message}</p>
                      <span className="alert-time">
                        Medicine: <strong>{alert.medicine_name}</strong> • {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Staff Management (Doctor) or Expiring Items list (Pharmacist) */}
        {userRole === 'Doctor' ? (
          <div className="dashboard-column glass-card">
            <div className="panel-header">
              <h3>Staff Account Management</h3>
              <span className="badge-count blue">{staffList.length}</span>
            </div>

            <div className="staff-panel-split">
              {/* Form to Register Staff */}
              <form onSubmit={handleAddStaff} className="staff-form">
                
                {staffError && <div className="error-box select-none">{staffError}</div>}
                {staffSuccess && <div className="success-box select-none">{staffSuccess}</div>}

                <div className="form-row">
                  <div className="input-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Shrisiddi Shetty"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({...staffForm, name: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label>Role</label>
                    <select 
                      value={staffForm.role}
                      onChange={(e) => setStaffForm({...staffForm, role: e.target.value})}
                    >
                      <option value="Pharmacist">Pharmacist</option>
                      <option value="Receptionist">Receptionist</option>
                      <option value="Nurse">Nurse</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="email@clinic.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="10-digit number"
                    value={staffForm.phoneNumber}
                    onChange={(e) => setStaffForm({...staffForm, phoneNumber: e.target.value})}
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={staffForm.password}
                      onChange={(e) => setStaffForm({...staffForm, password: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label>Confirm Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={staffForm.confirmPassword}
                      onChange={(e) => setStaffForm({...staffForm, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn staff-submit" disabled={staffSubmitLoading}>
                  <UserPlus size={18} />
                  {staffSubmitLoading ? 'Registering...' : 'Add Staff Account'}
                </button>

              </form>

              {/* Staff List */}
              <div className="staff-list-container">
                <h4>Registered Staff ({staffList.length})</h4>
                {staffList.length === 0 ? (
                  <p className="no-staff">No staff accounts registered yet.</p>
                ) : (
                  <ul className="staff-list">
                    {staffList.map(s => (
                      <li key={s.staff_id} className="staff-item">
                        <div className="staff-item-icon">
                          <UserCheck size={16} />
                        </div>
                        <div className="staff-item-details">
                          <p className="staff-item-name">{s.name}</p>
                          <p className="staff-item-role">{s.role} • {s.phone_number}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Pharmacist View: Display Expiring Inventory List instead */
          <div className="dashboard-column glass-card">
            <div className="panel-header">
              <h3>Expiring Medicines Tracker</h3>
              <span className="badge-count orange">{expiringMeds.length}</span>
            </div>

            <div className="expiring-list-container">
              {expiringMeds.length === 0 ? (
                <div className="feed-empty">
                  <Inbox size={32} className="empty-icon" />
                  <p>No medicines are expiring soon. Good job!</p>
                </div>
              ) : (
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Expiry Date</th>
                      <th>Stock Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringMeds.map(m => (
                      <tr key={m.medicine_id} className="expiring-row">
                        <td>{m.medicine_name.toUpperCase()}</td>
                        <td className="text-danger">{new Date(m.expiry_date).toLocaleDateString()}</td>
                        <td><strong>{m.quantity} units</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </section>

    </div>
  );
};

export default Dashboard;
