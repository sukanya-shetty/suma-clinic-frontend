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
  Printer,
  Key
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
import BillPopup from '../components/common/BillPopup';
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
  const isReceptionist = user && user.role === 'Receptionist';
  const isNurse = user && user.role === 'Nurse';

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

  // ─── Nurse & Receptionist Dashboard States ───
  const [pendingBillingQueue, setPendingBillingQueue] = useState([]);
  const [triageQueue, setTriageQueue] = useState([]);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [triageVisitId, setTriageVisitId] = useState(null);
  const [triagePatientName, setTriagePatientName] = useState('');
  const [triageForm, setTriageForm] = useState({ 
    blood_pressure: '120/80', 
    temperature: '98.6', 
    blood_sugar: '', 
    pulse_rate: '', 
    oxygen_level: '',
    height: '',
    weight: ''
  });
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [selectedBillingVisit, setSelectedBillingVisit] = useState(null);
  const [billingDetails, setBillingDetails] = useState(null);
  const [collectPaymentLoading, setCollectPaymentLoading] = useState(false);

  // ─── Staff Account Management States ───
  const [staffList, setStaffList] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
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
        const [staffRes, medsRes, expiringRes, patientsRes, resetsRes] = await Promise.all([
          staffService.getAllStaff(),
          inventoryService.getAllMedicines(),
          inventoryService.getExpiringMedicines(),
          patientService.getAllPatients(),
          staffService.getResetRequests()
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
        setResetRequests(resetsRes.requests || []);
        setAdminPatients(patientsList);
      } else if (isReceptionist) {
        // Receptionist Dashboard: Load patient registries and pending bills
        const [patientsRes, pendingBillingRes, recentVisitsRes] = await Promise.all([
          patientService.getAllPatients(),
          salesService.getPendingBillingVisits(),
          visitService.getRecentVisits()
        ]);

        const patientsList = patientsRes.patients || patientsRes || [];
        setAdminPatients(patientsList);
        setRecentVisits(recentVisitsRes.visits || []);
        setPendingBillingQueue(pendingBillingRes.visits || []);

        setStats({
          todayPatients: patientsList.length,
          todayDispensing: (pendingBillingRes.visits || []).length,
          totalMeds: 0,
          lowStockAlerts: 0,
          expiringAlerts: 0,
          staffCount: 0
        });
      } else if (isNurse) {
        // Nurse Dashboard: Load triage patient queue
        const [visitsRes] = await Promise.all([
          visitService.getRecentVisits()
        ]);

        const visitsList = visitsRes.visits || [];
        const triageList = visitsList.filter(v => v.diagnosis === 'Pending Triage' || !v.blood_pressure || v.blood_pressure === 'N/A');
        setTriageQueue(triageList);
        setRecentVisits(visitsList);

        setStats({
          todayPatients: visitsList.length,
          todayDispensing: 0,
          totalMeds: 0,
          lowStockAlerts: 0,
          expiringAlerts: 0,
          staffCount: 0
        });
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

  const handleResetPassword = async (staffId, staffName, staffRole) => {
    const newPassword = window.prompt(`Enter new password for ${staffRole} "${staffName}":`);
    if (newPassword === null) return;
    if (newPassword.trim().length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      setStaffError('');
      setStaffSuccess('');
      const response = await staffService.resetPassword(staffId, newPassword);
      if (response.success) {
        setStaffSuccess(`Password for ${staffRole} "${staffName}" was reset successfully.`);
      }
    } catch (err) {
      console.error(err);
      setStaffError(err.response?.data?.message || err.response?.data?.error || 'Failed to reset password.');
    }
  };

  const handleApproveRejectRequest = async (requestId, userName, action) => {
    const confirmed = window.confirm(`Are you sure you want to ${action} the password reset request for "${userName}"?`);
    if (!confirmed) return;

    try {
      setStaffError('');
      setStaffSuccess('');
      const response = await staffService.handleResetRequest(requestId, action);
      if (response.success) {
        setStaffSuccess(response.message);
        await loadDashboardData();
      }
    } catch (err) {
      console.error(err);
      setStaffError(err.response?.data?.message || err.response?.data?.error || `Failed to ${action} request.`);
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

  const handleTriageSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await visitService.triageVisit(triageVisitId, {
        blood_pressure: triageForm.blood_pressure,
        temperature: triageForm.temperature,
        blood_sugar: triageForm.blood_sugar ? parseFloat(triageForm.blood_sugar) : null,
        pulse_rate: triageForm.pulse_rate ? parseInt(triageForm.pulse_rate) : null,
        oxygen_level: triageForm.oxygen_level ? parseInt(triageForm.oxygen_level) : null,
        height: triageForm.height ? parseFloat(triageForm.height) : null,
        weight: triageForm.weight ? parseFloat(triageForm.weight) : null
      });
      if (res.success) {
        setIsTriageModalOpen(false);
        setTriageVisitId(null);
        setTriagePatientName('');
        setTriageForm({ blood_pressure: '120/80', temperature: '98.6', blood_sugar: '', pulse_rate: '', oxygen_level: '', height: '', weight: '' });
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to record triage vitals.');
    }
  };

  const openBillingModal = async (visit) => {
    setSelectedBillingVisit(visit);
    setIsBillingModalOpen(true);
    try {
      const res = await salesService.getPendingBillingDetails(visit.visit_id);
      setBillingDetails(res.prescriptions || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load pending bill details.');
    }
  };

  const handleCollectPayment = async (paymentMethod) => {
    if (!selectedBillingVisit) return;
    setCollectPaymentLoading(true);
    try {
      const res = await salesService.collectPayment({
        visit_id: selectedBillingVisit.visit_id,
        payment_method: paymentMethod || 'UPI QR Code'
      });
      if (res.success) {
        setIsBillingModalOpen(false);
        setGeneratedBill(res.receipt);
        setIsBillModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to collect cashier payment.');
    } finally {
      setCollectPaymentLoading(false);
    }
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
          <>
            <StatCard title="Staff Accounts" value={loading ? '...' : stats.staffCount} icon={<Users size={20} />} color="var(--primary)" />
            {resetRequests.length > 0 && (
              <StatCard 
                title="Reset Requests" 
                value={loading ? '...' : resetRequests.length} 
                icon={<AlertTriangle size={20} />} 
                color="var(--danger)" 
                onClick={() => {
                  const element = document.getElementById('reset-requests-section');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
            )}
          </>
        ) : isReceptionist ? (
          <>
            <StatCard title="Registered Patients" value={loading ? '...' : stats.todayPatients} icon={<Users size={20} />} color="var(--primary)" />
            <StatCard title="Pending Payments" value={loading ? '...' : stats.todayDispensing} icon={<DollarSign size={20} />} color="var(--warning)" />
          </>
        ) : isNurse ? (
          <StatCard title="Today's Patients" value={loading ? '...' : stats.todayPatients} icon={<Users size={20} />} color="var(--primary)" />
        ) : (
          <StatCard title="Today's Consultations" value={loading ? '...' : stats.todayPatients} icon={<Users size={20} />} color="var(--primary)" />
        )}
        
        {(isAdmin || isPharmacist) && (
          <>
            <StatCard title="Total Medicines" value={loading ? '...' : stats.totalMeds} icon={<Pill size={20} />} color="var(--success)" />
            <StatCard title="Low Stock Alerts" value={loading ? '...' : stats.lowStockAlerts} icon={<AlertTriangle size={20} />} color="var(--danger)" />
            <StatCard title="Near-Expiry Alerts" value={loading ? '...' : stats.expiringAlerts} icon={<AlertTriangle size={20} />} color="var(--warning)" />
          </>
        )}
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
              {resetRequests.length > 0 && (
                <a href="#reset-requests-section" className="btn btn-danger" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /><span>Password Reset Requests ({resetRequests.length})</span>
                </a>
              )}
              <button className="btn btn-secondary" onClick={() => navigate('/inventory')}>
                <PlusCircle size={16} /><span>Add / Restock Medicine</span>
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
          ) : isReceptionist ? (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/patients?openRegister=true')}>
                <UserPlus size={16} /><span>Register New Patient</span>
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/visits/new')}>
                <PlusCircle size={16} /><span>Issue OPD Card (New Visit)</span>
              </button>
            </>
          ) : isNurse ? (
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Please log vitals from the active patient queue below.</span>
          ) : isDoctor ? (
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Please consult patients from the triage completed queue below.</span>
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
                    <td><strong>₹{parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                  </tr>
                )}
                emptyMessage="No direct walk-in sales recorded today."
              />
            )}
          </section>
        </div>
      ) : isDoctor ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', width: '100%' }}>
          {/* Triaged Patient Queue */}
          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'inline-block' }}></span>
                Patients Triaged by Nurse (Awaiting Consultation)
              </h3>
            </div>
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading waiting list...
              </div>
            ) : (
              <Table
                headers={[
                  { key: 'visit_date', label: 'Triage Time' },
                  { key: 'patient_name', label: 'Patient Name' },
                  { key: 'vitals', label: 'Triage Vitals' },
                  { key: 'actions', label: 'Action' }
                ]}
                data={recentVisits.filter(v => v.diagnosis === 'Pending Consultation')}
                renderRow={(visit, index) => (
                  <tr key={visit.visit_id || index}>
                    <td>{formatVisitDate(visit.visit_date)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                      {visit.patient_name ? visit.patient_name.toUpperCase() : 'UNKNOWN'}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge badge-secondary" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>BP: {visit.blood_pressure || 'N/A'}</span>
                        <span className="badge badge-secondary" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>Temp: {visit.temperature ? `${visit.temperature}°F` : 'N/A'}</span>
                        <span className="badge badge-secondary" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>Sugar: {visit.blood_sugar ? `${visit.blood_sugar} mg/dL` : 'N/A'}</span>
                        <span className="badge badge-secondary" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>Pulse: {visit.pulse_rate ? `${visit.pulse_rate} bpm` : 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={() => navigate('/visits/new', { 
                          state: { 
                            patient: { 
                              patient_id: visit.patient_id, 
                              patient_name: visit.patient_name, 
                              assigned_doctor_id: user.id 
                            } 
                          } 
                        })}
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        Start Consultation
                      </button>
                    </td>
                  </tr>
                )}
                emptyMessage="No triaged patients waiting for your consultation."
              />
            )}
          </section>

          {/* Completed Consultations */}
          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Completed Consultations (Today)</h3>
            </div>
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading history...
              </div>
            ) : (
              <Table
                headers={[
                  { key: 'visit_date', label: 'Date/Time' },
                  { key: 'patient_name', label: 'Patient Name' },
                  { key: 'diagnosis', label: 'Final Diagnosis' },
                  { key: 'consultation_fee', label: 'Consult Fee (₹)' },
                  { key: 'actions', label: 'Actions' }
                ]}
                data={recentVisits.filter(v => v.diagnosis !== 'Pending Consultation' && v.diagnosis !== 'Pending Triage')}
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
                    <td style={{ fontWeight: 500 }}>{visit.diagnosis || '-'}</td>
                    <td>₹{parseFloat(visit.consultation_fee || 250).toFixed(2)}</td>
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
                emptyMessage="No completed consultations recorded by you today."
              />
            )}
          </section>
        </div>
      ) : isNurse ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', width: '100%' }}>
          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Triage Patient Queue (Vitals Pending)</h3>
            </div>
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading triage queue...
              </div>
            ) : (
              <Table
                headers={[
                  { key: 'visit_date', label: 'Registered Time' },
                  { key: 'patient_name', label: 'Patient Name' },
                  { key: 'doctor_name', label: 'Assigned Doctor' },
                  { key: 'diagnosis', label: 'Vitals Status' },
                  { key: 'actions', label: 'Action' }
                ]}
                data={triageQueue}
                renderRow={(visit, index) => (
                  <tr key={visit.visit_id || index}>
                    <td>{formatVisitDate(visit.visit_date)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {visit.patient_name ? visit.patient_name.toUpperCase() : 'UNKNOWN'}
                    </td>
                    <td>{visit.doctor_name || 'General Physician'}</td>
                    <td>
                      <span className="badge badge-warning" style={{ backgroundColor: '#b45309', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                        Pending Vitals
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setTriageVisitId(visit.visit_id);
                          setTriagePatientName(visit.patient_name);
                          setIsTriageModalOpen(true);
                        }}
                      >
                        Record Vitals
                      </button>
                    </td>
                  </tr>
                )}
                emptyMessage="No patients currently waiting in the triage queue."
              />
            )}
          </section>

          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Recent Hospital Visits</h3>
            </div>
            <Table
              headers={[
                { key: 'visit_date', label: 'Date/Time' },
                { key: 'patient_name', label: 'Patient Name' },
                { key: 'bp', label: 'Blood Pressure' },
                { key: 'temp', label: 'Temp' },
                { key: 'sugar', label: 'Sugar (mg/dL)' },
                { key: 'pulse', label: 'Pulse' },
                { key: 'o2', label: 'SPO2' }
              ]}
              data={recentVisits.slice(0, 10)}
              renderRow={(visit, index) => (
                <tr key={visit.visit_id || index}>
                  <td>{formatVisitDate(visit.visit_date)}</td>
                  <td>{visit.patient_name ? visit.patient_name.toUpperCase() : 'UNKNOWN'}</td>
                  <td>{visit.blood_pressure || '-'}</td>
                  <td>{visit.temperature ? `${visit.temperature}°F` : '-'}</td>
                  <td>{visit.blood_sugar ? `${visit.blood_sugar} mg/dL` : '-'}</td>
                  <td>{visit.pulse_rate ? `${visit.pulse_rate} bpm` : '-'}</td>
                  <td>{visit.oxygen_level ? `${visit.oxygen_level}%` : '-'}</td>
                </tr>
              )}
              emptyMessage="No recent visits logged today."
            />
          </section>
        </div>
      ) : isReceptionist ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', width: '100%' }}>
          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Central Cash Desk - Unpaid Pharmacy Bills</h3>
            </div>
            {loading ? (
              <div className="loading-inline" style={{ padding: '24px 0' }}>
                <span className="spinner"></span> Loading pending bills...
              </div>
            ) : (
              <Table
                headers={[
                  { key: 'visit_date', label: 'Date' },
                  { key: 'patient_name', label: 'Patient Name' },
                  { key: 'doctor_name', label: 'Doctor' },
                  { key: 'unpaid_items_count', label: 'Prescribed Items' },
                  { key: 'estimated_bill_amount', label: 'Est. Total' },
                  { key: 'actions', label: 'Action' }
                ]}
                data={pendingBillingQueue}
                renderRow={(visit, index) => (
                  <tr key={visit.visit_id || index}>
                    <td>{formatVisitDate(visit.visit_date)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {visit.patient_name ? visit.patient_name.toUpperCase() : 'UNKNOWN'}
                    </td>
                    <td>{visit.doctor_name}</td>
                    <td>{visit.unpaid_items_count} items</td>
                    <td><strong>₹{parseFloat(visit.estimated_bill_amount || 0).toFixed(2)}</strong></td>
                    <td>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem', backgroundColor: '#059669', borderColor: '#059669' }}
                        onClick={() => openBillingModal(visit)}
                      >
                        Collect &amp; Print Bill
                      </button>
                    </td>
                  </tr>
                )}
                emptyMessage="No pending pharmacy payments in queue."
              />
            )}
          </section>

          <section className={styles.recentVisitsCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.sectionTitle}>Active Patients Directory</h3>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => navigate('/patients?openRegister=true')}>
                Register New Patient
              </button>
            </div>
            <Table
              headers={[
                { key: 'patient_name', label: 'Patient Name' },
                { key: 'age_gender', label: 'Age / Gender' },
                { key: 'phone', label: 'Phone' },
                { key: 'address', label: 'Address' },
                { key: 'actions', label: 'Actions' }
              ]}
              data={adminPatients.slice(0, 10)}
              renderRow={(patient, index) => (
                <tr key={patient.patient_id || index}>
                  <td style={{ fontWeight: 600 }}>{patient.patient_name.toUpperCase()}</td>
                  <td>{patient.age} Yrs / {patient.gender}</td>
                  <td>{patient.phone_number}</td>
                  <td>{patient.address || '-'}</td>
                  <td>
                    <button 
                      onClick={() => navigate(`/patients/${patient.patient_id}`)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '6px' }}
                    >
                      Medical History
                    </button>
                    <button 
                      onClick={() => navigate('/visits/new', { state: { patient } })}
                      className="btn btn-primary"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      New Visit Token
                    </button>
                  </td>
                </tr>
              )}
              emptyMessage="No patients registered yet."
            />
          </section>
        </div>
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
                          style={{ marginRight: '8px', color: 'var(--primary)' }}
                          onClick={() => handleResetPassword(s.staff_id, s.name, s.role)}
                          title={`Reset ${s.role} Password`}
                        >
                          <Key size={16} />
                        </button>
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

            {/* Password Reset Requests */}
            {resetRequests.length > 0 && (
              <div id="reset-requests-section" className={styles.staffListContainer} style={{ marginTop: '24px' }}>
                <h4 className={styles.formSubtitle} style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} /> Pending Password Reset Requests ({resetRequests.length})
                </h4>
                <div className={styles.staffListWrapper}>
                  <ul className={styles.staffList}>
                    {resetRequests.map(r => (
                      <li key={r.request_id} className={styles.staffItem}>
                        <div className={styles.staffItemIcon} style={{ color: 'var(--danger)', backgroundColor: '#FEF2F2' }}>
                          <AlertTriangle size={16} />
                        </div>
                        <div className={styles.staffItemDetails}>
                          <div className={styles.staffItemName}>{r.name.toUpperCase()}</div>
                          <div className={styles.staffItemRole}>
                            <span className={styles.roleBadge} style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                              {r.role}
                            </span>
                            {r.department && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                                Dept: {r.department}
                              </span>
                            )}
                            <span className={styles.divider}>•</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Requested: {new Date(r.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.staffItemEmail} style={{ fontStyle: 'italic' }}>{r.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="login-btn staff-submit"
                            style={{ padding: '6px 12px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem', width: 'auto', marginTop: 0, cursor: 'pointer' }}
                            onClick={() => handleApproveRejectRequest(r.request_id, r.name, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="login-btn staff-submit"
                            style={{ padding: '6px 12px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem', width: 'auto', marginTop: 0, cursor: 'pointer' }}
                            onClick={() => handleApproveRejectRequest(r.request_id, r.name, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── PHARMACIST DISPENSING CHECKOUT MODAL ─── */}
      <Modal 
        isOpen={isDispenseModalOpen} 
        onClose={() => setIsDispenseModalOpen(false)}
        title={`Dispensing Checkout - Patient: ${(selectedPatientName || '').toUpperCase()}`}
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

      <BillPopup 
        isOpen={isBillModalOpen} 
        onClose={closeBillAndReload} 
        billData={generatedBill} 
      />

      {/* ─── NURSE TRIAGE MODAL ─── */}
      <Modal
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        title={`Log Vitals - Patient: ${(triagePatientName || '').toUpperCase()}`}
      >
        <form onSubmit={handleTriageSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Blood Pressure (SYS/DIA)</label>
              <input 
                type="text" 
                className="form-control" 
                value={triageForm.blood_pressure}
                onChange={e => setTriageForm(prev => ({ ...prev, blood_pressure: e.target.value }))}
                placeholder="120/80"
                required
              />
            </div>
            <div className="form-group">
              <label>Temperature (°F)</label>
              <input 
                type="number" 
                step="0.1"
                className="form-control" 
                value={triageForm.temperature}
                onChange={e => setTriageForm(prev => ({ ...prev, temperature: e.target.value }))}
                placeholder="98.6"
                required
              />
            </div>
            <div className="form-group">
              <label>Blood Sugar (mg/dL)</label>
              <input 
                type="number" 
                className="form-control" 
                value={triageForm.blood_sugar}
                onChange={e => setTriageForm(prev => ({ ...prev, blood_sugar: e.target.value }))}
                placeholder="e.g. 100"
              />
            </div>
            <div className="form-group">
              <label>Pulse Rate (bpm)</label>
              <input 
                type="number" 
                className="form-control" 
                value={triageForm.pulse_rate}
                onChange={e => setTriageForm(prev => ({ ...prev, pulse_rate: e.target.value }))}
                placeholder="e.g. 72"
              />
            </div>
            <div className="form-group">
              <label>Oxygen Saturation (SPO2 %)</label>
              <input 
                type="number" 
                className="form-control" 
                value={triageForm.oxygen_level}
                onChange={e => setTriageForm(prev => ({ ...prev, oxygen_level: e.target.value }))}
                placeholder="e.g. 98"
              />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input 
                type="number" 
                step="0.1"
                className="form-control" 
                value={triageForm.height}
                onChange={e => setTriageForm(prev => ({ ...prev, height: e.target.value }))}
                placeholder="e.g. 170"
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Weight (kg)</label>
              <input 
                type="number" 
                step="0.1"
                className="form-control" 
                value={triageForm.weight}
                onChange={e => setTriageForm(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="e.g. 60"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTriageModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Vitals &amp; Send to Doctor
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── CASHIER BILLING MODAL ─── */}
      <Modal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        title="Central Billing Counter - Invoice Details"
      >
        {selectedBillingVisit && (
          <div>
            <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#1e293b' }}>
              <p><strong>Patient Name:</strong> {selectedBillingVisit.patient_name.toUpperCase()}</p>
              <p><strong>Doctor In-Charge:</strong> {selectedBillingVisit.doctor_name}</p>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#334155', fontSize: '0.85rem', marginBottom: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#0f172a' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0' }}>Medicine</th>
                  <th style={{ textAlign: 'center', padding: '8px 0' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '8px 0' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '8px 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {billingDetails && billingDetails.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px dashed #cbd5e1' }}>
                    <td style={{ padding: '8px 0' }}>{item.medicine_name}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>{item.quantity || item.calculated_quantity}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>₹{parseFloat(item.price).toFixed(2)}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>₹{parseFloat((item.quantity || item.calculated_quantity) * item.price).toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ borderBottom: '1px dashed #cbd5e1' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Doctor Consultation Fee ({selectedBillingVisit.doctor_name})</td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }}>1</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>₹{parseFloat(selectedBillingVisit.consultation_fee || 250).toFixed(2)}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>₹{parseFloat(selectedBillingVisit.consultation_fee || 250).toFixed(2)}</td>
                </tr>
                <tr style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#0f172a' }}>
                  <td colSpan="3" style={{ padding: '12px 0', borderTop: '1px solid #cbd5e1' }}>Grand Total</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', borderTop: '1px solid #cbd5e1', color: '#16a34a' }}>
                    ₹{parseFloat(selectedBillingVisit.estimated_bill_amount || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsBillingModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleCollectPayment('Cash')}
                disabled={collectPaymentLoading}
              >
                {collectPaymentLoading ? 'Processing...' : 'Print'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DashboardPage;
