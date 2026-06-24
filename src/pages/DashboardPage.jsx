import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Pill, 
  AlertTriangle, 
  UserPlus, 
  PlusCircle, 
  Calendar,
  X,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  DollarSign,
  PenTool,
  Printer
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { inventoryService } from '../services/inventoryService';
import { visitService } from '../services/visitService';
import { staffService } from '../services/staffService';
import { salesService } from '../services/salesService';
import { AuthContext } from '../context/AuthContext';
import StatCard from '../components/common/StatCard';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import styles from './DashboardPage.module.css';

const DEPARTMENTS = [
  'General Medicine',
  'Orthopedics',
  'Dermatology',
  'Gynecology',
  'Pediatrics'
];

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user && user.role === 'Admin';
  const isDoctor = user && user.role === 'Doctor';
  const isPharmacist = user && user.role === 'Pharmacist';

  const [stats, setStats] = useState({
    todayPatients: 0,
    todayDispensing: 0,
    totalMeds: 0,
    lowStockAlerts: 0,
    expiringAlerts: 0,
    staffCount: 0
  });

  const [lowStockMedsList, setLowStockMedsList] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [recentWalkInSales, setRecentWalkInSales] = useState([]);
  const [adminPatients, setAdminPatients] = useState([]);
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
    role: 'Pharmacist',
    department: 'General Medicine'
  });
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffSubmitLoading, setStaffSubmitLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ─── Dispensing & Billing States ───
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [dispenseItems, setDispenseItems] = useState([]);
  const [dispenseError, setDispenseError] = useState('');
  const [dispenseLoading, setDispenseLoading] = useState(false);
  
  // Canvas drawing state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Bill popup state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      if (isPharmacist) {
        // Pharmacist Dashboard: Load medicines, sales, alerts, pending queue
        const [medsRes, expiringRes, salesRes, pendingRes] = await Promise.all([
          inventoryService.getAllMedicines(),
          inventoryService.getExpiringMedicines(),
          salesService.getAllSales({ startDate: todayStr, endDate: todayStr }),
          visitService.getRecentPrescriptions() // fetches pending undispensed prescriptions queue
        ]);

        const medicinesList = medsRes.medicines || medsRes || [];
        const lowStockMeds = medicinesList.filter(m => m.quantity < 10);
        const lowStockNames = lowStockMeds.map(m => m.medicine_name.toUpperCase());

        const salesList = salesRes.sales || salesRes || [];
        const todayDispenseCount = salesList.filter(s => s.sale_type === 'Consultation').length;

        setStats({
          todayPatients: 0,
          todayDispensing: todayDispenseCount,
          totalMeds: medicinesList.length,
          lowStockAlerts: lowStockMeds.length,
          expiringAlerts: (expiringRes.medicines || expiringRes || []).length,
          staffCount: 0
        });

        setLowStockMedsList(lowStockNames);
        setRecentWalkInSales(salesList.filter(s => s.sale_type === 'Direct Walk-in'));
        setPendingPrescriptions(pendingRes.prescriptions || []);
      } else if (isAdmin) {
        // Admin Dashboard: Load staff roster, medicines catalog, alerts, and patients list
        const [staffRes, medsRes, expiringRes, patientsRes] = await Promise.all([
          staffService.getAllStaff(),
          inventoryService.getAllMedicines(),
          inventoryService.getExpiringMedicines(),
          patientService.getAllPatients()
        ]);

        const medicinesList = medsRes.medicines || medsRes || [];
        const lowStockMeds = medicinesList.filter(m => m.quantity < 10);
        const lowStockNames = lowStockMeds.map(m => m.medicine_name.toUpperCase());
        const roster = staffRes.staff || [];
        const patientsList = patientsRes.patients || patientsRes || [];

        setStats({
          todayPatients: patientsList.length,
          todayDispensing: 0,
          totalMeds: medicinesList.length,
          lowStockAlerts: lowStockMeds.length,
          expiringAlerts: (expiringRes.medicines || expiringRes || []).length,
          staffCount: roster.length
        });

        setLowStockMedsList(lowStockNames);
        setStaffList(roster);
        setAdminPatients(patientsList);
      } else {
        // Doctor Dashboard: Load consultations, patients count, inventory alerts
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
          expiringAlerts: (expiringRes.medicines || expiringRes || []).length,
          staffCount: 0
        });

        setLowStockMedsList(lowStockNames);
        setRecentVisits(visitsRes.visits || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(`Failed to retrieve dashboard statistics (${errMsg}).`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // ─── Staff Account Operations ───
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setStaffForm(prev => ({ ...prev, phoneNumber: val }));
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');

    const { name, email, phoneNumber, password, confirmPassword, role, department } = staffForm;

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
      const response = await staffService.addStaff({
        name,
        email,
        phoneNumber,
        password,
        confirmPassword,
        role,
        department: role === 'Doctor' ? department : null
      });
      if (response.success) {
        setStaffSuccess('Staff account created successfully!');
        setStaffForm({
          name: '',
          email: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          role: 'Pharmacist',
          department: 'General Medicine'
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
        await loadDashboardData();
      }
    } catch (err) {
      console.error(err);
      setStaffError(err.response?.data?.message || err.response?.data?.error || 'Failed to add staff member.');
    } finally {
      setStaffSubmitLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId, staffName, staffRole) => {
    const confirmed = window.confirm(`Are you absolutely sure you want to delete ${staffRole} "${staffName}"?`);
    if (!confirmed) return;

    try {
      setStaffError('');
      setStaffSuccess('');
      const response = await staffService.deleteStaff(staffId);
      if (response.success) {
        setStaffSuccess(`${staffRole} "${staffName}" was successfully deleted.`);
        await loadDashboardData();
      }
    } catch (err) {
      console.error(err);
      setStaffError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete staff member.');
    }
  };

  // ─── Pharmacist Dispense flow ───
  const openDispenseModal = async (visitId, patientName) => {
    setDispenseError('');
    setSelectedVisitId(visitId);
    setSelectedPatientName(patientName);
    setDispenseLoading(true);
    setIsDispenseModalOpen(true);
    
    try {
      // Get all prescriptions for this visit
      const res = await visitService.getPrescriptionsByVisit(visitId);
      const items = res.prescriptions || [];
      
      // Filter out items that are already dispensed
      const pendingItems = items.filter(i => !i.dispensed_at);
      
      setDispenseItems(pendingItems.map(i => ({
        prescription_id: i.prescription_id,
        medicine_name: i.medicine_name,
        dosage_pattern: i.dosage_pattern,
        days: i.days,
        calculated_quantity: i.calculated_quantity,
        dispensed_quantity: i.calculated_quantity // initialized to calculated qty
      })));
    } catch (err) {
      console.error(err);
      setDispenseError('Failed to retrieve prescriptions for dispensing.');
    } finally {
      setDispenseLoading(false);
    }
  };

  const handleDispenseQtyChange = (index, value) => {
    const updated = [...dispenseItems];
    updated[index].dispensed_quantity = parseFloat(value) || 0;
    setDispenseItems(updated);
  };

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1E3A8A'; // Blue ink
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    setDispenseError('');

    // Capture signature Data URL
    let signatureRef = null;
    if (canvasRef.current) {
      signatureRef = canvasRef.current.toDataURL();
    }

    setDispenseLoading(true);
    try {
      const itemsToSubmit = dispenseItems.map(i => ({
        prescription_id: i.prescription_id,
        dispensed_quantity: parseFloat(i.dispensed_quantity)
      }));

      // Call API to dispense
      const res = await salesService.dispensePrescription({
        visit_id: selectedVisitId,
        items: itemsToSubmit,
        signature_ref: signatureRef
      });

      if (res.success) {
        setIsDispenseModalOpen(false);
        setGeneratedBill(res.bill);
        setIsBillModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      setDispenseError(err.response?.data?.error || 'Dispense confirmation failed. Check stock levels.');
    } finally {
      setDispenseLoading(false);
    }
  };

  const triggerPrintBill = () => {
    window.print();
  };

  const closeBillAndReload = () => {
    setIsBillModalOpen(false);
    setGeneratedBill(null);
    loadDashboardData();
  };

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

  // Group prescriptions by visit_id to list pending visits
  const uniquePendingVisits = pendingPrescriptions.reduce((acc, current) => {
    const existing = acc.find(v => v.visit_id === current.visit_id);
    if (!existing) {
      acc.push({
        visit_id: current.visit_id,
        patient_name: current.patient_name,
        patient_id: current.patient_id,
        created_at: current.created_at,
        medicines: [current.medicine_name.toUpperCase()]
      });
    } else {
      existing.medicines.push(current.medicine_name.toUpperCase());
    }
    return acc;
  }, []);

  return (
    <div className={`${styles.dashboardGrid} ${isAdmin ? styles.adminTheme : ''}`}>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ─── LOW STOCK NOTIFICATION BANNER ─── */}
      {!loading && lowStockMedsList.length > 0 && (
        <div className={styles.lowStockBanner}>
          <div className={styles.alertIcon}><AlertTriangle size={20} /></div>
          <div className={styles.alertContent}>
            <span className={styles.alertTitle}>Attention: Low Stock Alert</span>
            <span className={styles.alertDesc}>
              The following medicines need restocking: <strong>{lowStockMedsList.join(', ')}</strong>
            </span>
          </div>
          <button className={styles.bannerBtn} onClick={() => navigate('/inventory')}>
            Manage Inventory
          </button>
        </div>
      )}

      {/* ─── STAT CARDS ─── */}
      <section className={styles.statsRow}>
        {isPharmacist ? (
          <StatCard title="Today's Fulfillment" value={loading ? '...' : stats.todayDispensing} icon={<DollarSign size={20} />} color="var(--primary)" />
        ) : isAdmin ? (
          <StatCard title="Staff Accounts" value={loading ? '...' : stats.staffCount} icon={<Users size={20} />} color="var(--primary)" />
        ) : (
          <StatCard title="Today's Consultations" value={loading ? '...' : stats.todayPatients} icon={<Users size={20} />} color="var(--primary)" />
        )}
        <StatCard title="Total Medicines" value={loading ? '...' : stats.totalMeds} icon={<Pill size={20} />} color="var(--success)" />
        <StatCard title="Low Stock Alerts" value={loading ? '...' : stats.lowStockAlerts} icon={<AlertTriangle size={20} />} color="var(--danger)" />
        <StatCard title="Near-Expiry Alerts" value={loading ? '...' : stats.expiringAlerts} icon={<AlertTriangle size={20} />} color="var(--warning)" />
      </section>

      {/* ─── QUICK OPERATIONS ─── */}
      <section className={styles.quickActionsCard}>
        <h3 className={styles.sectionTitle}>Quick Operations</h3>
        <div className={styles.actionsRow}>
          {isAdmin ? (
            <>
              <a href="#staff-management-section" className="btn btn-primary">
                <UserPlus size={16} /><span>Manage Staff Accounts</span>
              </a>
              <button className="btn btn-secondary" onClick={() => navigate('/inventory')}>
                <PlusCircle size={16} /><span>Add / Restock Medicine</span>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
                <Printer size={16} /><span>View Business Reports</span>
              </button>
            </>
          ) : isPharmacist ? (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/sales/walkin')}>
                <PlusCircle size={16} /><span>Direct Medicine Dispensing</span>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/sales')}>
                <DollarSign size={16} /><span>Billing & Sales Logs</span>
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/patients?openRegister=true')}>
                <UserPlus size={16} /><span>Register New Patient</span>
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/visits/new')}>
                <PlusCircle size={16} /><span>Record Consultation Visit</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* ─── RECENT VISITS / PENDING QUEUES ─── */}
      {isPharmacist ? (
        <div className={styles.pharmacistTablesRow}>
          {/* Pending Prescriptions Fulfillment Queue */}
          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Prescription Fulfillment Queue (Pending Dispensing)</h3>
            </div>
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading queue...
              </div>
            ) : (
              <Table
                headers={[
                  { key: 'created_at', label: 'Date/Time' },
                  { key: 'patient_name', label: 'Patient Name' },
                  { key: 'medicines', label: 'Prescribed Medicines' },
                  { key: 'actions', label: 'Action' }
                ]}
                data={uniquePendingVisits}
                renderRow={(visit, index) => (
                  <tr key={visit.visit_id || index}>
                    <td>{formatVisitDate(visit.created_at)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{visit.patient_name.toUpperCase()}</td>
                    <td>{visit.medicines.join(', ')}</td>
                    <td>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => openDispenseModal(visit.visit_id, visit.patient_name)}
                      >
                        Dispense &amp; Bill
                      </button>
                    </td>
                  </tr>
                )}
                emptyMessage="No pending prescriptions to dispense at the moment."
              />
            )}
          </section>

          {/* Recent Walk-in Sales */}
          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Recent Walk-in Transactions</h3>
            </div>
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading walk-ins...
              </div>
            ) : (
              <Table
                headers={[
                  { key: 'sale_date', label: 'Date' },
                  { key: 'medicine_name', label: 'Medicine' },
                  { key: 'quantity_sold', label: 'Qty' },
                  { key: 'total_amount', label: 'Amount' }
                ]}
                data={recentWalkInSales.slice(0, 10)}
                renderRow={(sale, index) => (
                  <tr key={sale.sale_id || index}>
                    <td>{formatVisitDate(sale.sale_date)}</td>
                    <td style={{ fontWeight: 600 }}>{sale.medicine_name.toUpperCase()}</td>
                    <td>{sale.quantity_sold} units</td>
                    <td><strong>${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                  </tr>
                )}
                emptyMessage="No direct walk-in sales recorded today."
              />
            )}
          </section>
        </div>
      ) : isDoctor ? (
        <section className={styles.recentVisitsCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.sectionTitle}>My Recent Consultations</h3>
          </div>
          {loading ? (
            <div className="loading-inline" style={{ padding: '24px 0' }}>
              <span className="spinner"></span> Loading consultations...
            </div>
          ) : (
            <Table
              headers={[
                { key: 'visit_date', label: 'Date/Time' },
                { key: 'patient_name', label: 'Patient Name' },
                { key: 'diagnosis', label: 'Diagnosis' },
                { key: 'blood_pressure', label: 'Blood Pressure' },
                { key: 'temperature', label: 'Temp' },
                { key: 'actions', label: 'Actions' }
              ]}
              data={recentVisits}
              renderRow={(visit, index) => (
                <tr key={visit.visit_id || index}>
                  <td>{formatVisitDate(visit.visit_date)}</td>
                  <td>
                    <span 
                      style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                      onClick={() => navigate(`/patients/${visit.patient_id}`)}
                    >
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
                      View Record
                    </button>
                  </td>
                </tr>
              )}
              emptyMessage="No consultations recorded by you today."
            />
          )}
        </section>
      ) : null}

      {/* ─── GLOBAL PATIENT REGISTRY & ASSIGNED DOCTORS (ADMIN ONLY) ─── */}
      {isAdmin && (
        <section className={styles.recentVisitsCard} style={{ marginBottom: '24px' }}>
          <div className={styles.tableHeader}>
            <h3 className={styles.sectionTitle}>Global Patient Registry &amp; Doctor Consultation Isolation</h3>
          </div>
          {loading ? (
            <div className="loading-inline" style={{ padding: '24px 0' }}>
              <span className="spinner"></span> Loading patient directory...
            </div>
          ) : (
            <Table
              headers={[
                { key: 'patient_name', label: 'Patient Name' },
                { key: 'age_gender', label: 'Age / Gender' },
                { key: 'weight', label: 'Weight' },
                { key: 'doctor_name', label: 'Assigned Consultant' },
                { key: 'doctor_dept', label: 'Department' },
                { key: 'actions', label: 'Actions' }
              ]}
              data={adminPatients}
              renderRow={(patient, index) => (
                <tr key={patient.patient_id || index}>
                  <td>
                    <span 
                      style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                      onClick={() => navigate(`/patients/${patient.patient_id}`)}
                    >
                      {patient.patient_name ? patient.patient_name.toUpperCase() : 'UNKNOWN'}
                    </span>
                  </td>
                  <td>{patient.age} yrs / {patient.gender}</td>
                  <td>{patient.weight ? `${patient.weight} kg` : '-'}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#374151' }}>
                      {patient.doctor_name ? `DR. ${patient.doctor_name.toUpperCase()}` : 'NO ASSIGNED DOCTOR'}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{ fontSize: '0.8rem', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '4px 8px', borderRadius: 4 }}>
                      {patient.doctor_department || 'General Medicine'}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => navigate(`/patients/${patient.patient_id}`)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      View Record
                    </button>
                  </td>
                </tr>
              )}
              emptyMessage="No patients registered in the hospital system."
            />
          )}
        </section>
      )}

      {/* ─── STAFF MANAGEMENT PANEL (ADMIN ONLY) ─── */}
      {isAdmin && (
        <section id="staff-management-section" className={styles.staffManagementCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--primary)' }} />
              <span>Hospital Staff Roster &amp; Access Controls</span>
            </h3>
            <span className={styles.badgeCount}>
              {staffList.length} Roster Accounts
            </span>
          </div>

          <div className={styles.staffGrid}>
            {/* Form */}
            <form onSubmit={handleAddStaff} className={styles.staffForm}>
              <h4 className={styles.formSubtitle}>Create User Account</h4>
              
              {staffError && <div className="alert alert-danger" style={{ fontSize: '0.85rem', padding: '8px 12px', marginBottom: 12 }}>{staffError}</div>}
              {staffSuccess && <div className="alert alert-success" style={{ fontSize: '0.85rem', padding: '8px 12px', marginBottom: 12 }}>{staffSuccess}</div>}

              <div className={styles.formRow}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="staffName" className={styles.inputLabel}>Full Name *</label>
                  <input
                    type="text"
                    id="staffName"
                    className="form-control"
                    placeholder="e.g. Dr. Jane Smith"
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
                    <option value="Doctor">Doctor</option>
                  </select>
                </div>
              </div>

              {staffForm.role === 'Doctor' && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="staffDept" className={styles.inputLabel}>Department / Specialization *</label>
                  <select
                    id="staffDept"
                    className="form-control"
                    value={staffForm.department}
                    onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                    disabled={staffSubmitLoading}
                    required
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

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
                <span>{staffSubmitLoading ? 'Creating User...' : 'Create Account'}</span>
              </button>
            </form>

            {/* List */}
            <div className={styles.staffListContainer}>
              <h4 className={styles.formSubtitle}>Roster Accounts List ({staffList.length})</h4>
              {staffList.length === 0 ? (
                <div className={styles.noStaff}>No staff members registered.</div>
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
                            <span className={styles.roleBadge} style={{
                              backgroundColor: s.role === 'Doctor' ? 'var(--primary-bg)' : '#F3F4F6',
                              color: s.role === 'Doctor' ? 'var(--primary)' : '#4B5563'
                            }}>{s.role}</span>
                            {s.department && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                                Dept: {s.department}
                              </span>
                            )}
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

      {/* ─── PHARMACIST DISPENSING CHECKOUT MODAL ─── */}
      <Modal 
        isOpen={isDispenseModalOpen} 
        onClose={() => setIsDispenseModalOpen(false)}
        title={`Dispensing Checkout - Patient: ${selectedPatientName.toUpperCase()}`}
      >
        <form onSubmit={handleDispenseSubmit}>
          {dispenseError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{dispenseError}</div>}
          
          {dispenseLoading && dispenseItems.length === 0 ? (
            <div className="loading-inline" style={{ padding: '16px 0' }}>
              <span className="spinner"></span> Loading items...
            </div>
          ) : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Medicine</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Prescribed Pattern</th>
                    <th style={{ textAlign: 'center', padding: 8 }}>Auto-calculated Qty</th>
                    <th style={{ textAlign: 'center', padding: 8, width: '100px' }}>Dispense Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {dispenseItems.map((item, index) => (
                    <tr key={item.prescription_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{item.medicine_name.toUpperCase()}</td>
                      <td style={{ padding: 8 }}>{item.dosage_pattern} ({item.days} days)</td>
                      <td style={{ padding: 8, textAlign: 'center' }}><strong>{item.calculated_quantity}</strong></td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <input 
                          type="number"
                          step="any"
                          className="form-control"
                          style={{ textAlign: 'center', padding: '4px' }}
                          value={item.dispensed_quantity}
                          onChange={(e) => handleDispenseQtyChange(index, e.target.value)}
                          min="0"
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signature pad section */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, backgroundColor: '#FAFBFD', marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PenTool size={16} />
                  <span>Pharmacist Digital Signature (Required once per transaction)</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    style={{ border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'crosshair', width: '100%' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <button type="button" className="btn btn-secondary" onClick={clearSignature} style={{ marginTop: 8, padding: '4px 10px', fontSize: '0.78rem' }}>
                    Clear Pad
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDispenseModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={dispenseLoading}>
                  {dispenseLoading ? 'Confirming Dispense...' : 'Confirm Fulfillment & Print Bill'}
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ─── PRINTABLE BILL INVOICE MODAL ─── */}
      <Modal 
        isOpen={isBillModalOpen}
        onClose={closeBillAndReload}
        title="Fulfillment Invoice Generated"
      >
        {generatedBill && (
          <div>
            {/* Invoice frame containing printable content */}
            <div className="printable-invoice" style={{
              border: '1px solid #ddd',
              borderRadius: 6,
              padding: 24,
              backgroundColor: '#fff',
              color: '#333',
              fontFamily: 'monospace, sans-serif',
              marginBottom: 16
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontWeight: 800 }}>SUMA CLINIC &amp; MEDICAL CENTER</h2>
                <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>123 Health Ave, Medical District, City</p>
                <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>Phone: +1 (555) 019-2834</p>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #333', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 12 }}>
                <div>
                  <strong>BILL NO:</strong> {generatedBill.bill_number}<br />
                  <strong>PATIENT:</strong> {generatedBill.patient_name.toUpperCase()}<br />
                  <strong>PATIENT ID:</strong> #{generatedBill.patient_id}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>DATE:</strong> {new Date(generatedBill.created_at).toLocaleDateString()}<br />
                  <strong>TIME:</strong> {new Date(generatedBill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '6px 0' }}>MEDICINE NAME</th>
                    <th style={{ padding: '6px 0', textAlign: 'center' }}>QTY</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>PRICE</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedBill.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dashed #eee' }}>
                      <td style={{ padding: '6px 0', fontWeight: 600 }}>{item.medicine_name.toUpperCase()}</td>
                      <td style={{ padding: '6px 0', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>${parseFloat(item.price_per_unit).toFixed(2)}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', fontSize: '1rem', borderTop: '1px solid #333' }}>
                    <td colSpan="3" style={{ padding: '10px 0' }}>GRAND TOTAL</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>${parseFloat(generatedBill.total_amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24 }}>
                <span style={{ fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>Pharmacist Digital Signature:</span>
                {generatedBill.signature_ref ? (
                  <img 
                    src={generatedBill.signature_ref} 
                    alt="Pharmacist Signature" 
                    style={{ width: 140, height: 45, borderBottom: '1px solid #333' }}
                  />
                ) : (
                  <div style={{ width: 140, height: 45, borderBottom: '1px dashed #333', textAlign: 'center', fontSize: '0.7rem', padding: 12 }}>Unsigned</div>
                )}
                <span style={{ fontSize: '0.78rem', marginTop: 4 }}>Authorized Stamp</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={triggerPrintBill}>
                <Printer size={16} /> Print / Save as PDF
              </button>
              <button className="btn btn-primary" onClick={closeBillAndReload}>
                Close &amp; Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DashboardPage;
