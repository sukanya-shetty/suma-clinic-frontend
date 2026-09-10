import React, { useState, useEffect, useContext } from 'react';
import { BarChart2, TrendingUp, Users, Pill, RefreshCw } from 'lucide-react';
import { salesService } from '../services/salesService';
import { patientService } from '../services/patientService';
import { inventoryService } from '../services/inventoryService';
import { AuthContext } from '../context/AuthContext';
import StatCard from '../components/common/StatCard';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import styles from './ReportsPage.module.css';

const ReportsPage = () => {
  const { user } = useContext(AuthContext);
  const isDoctor = user && user.role === 'Doctor';

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [sales, setSales] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const promises = [
        salesService.getAllSales({ startDate, endDate }),
        inventoryService.getAllMedicines()
      ];
      if (isDoctor) {
        promises.push(patientService.getAllPatients());
      }

      const results = await Promise.all(promises);
      
      setSales(results[0].sales || []);
      setMedicines(results[1].medicines || results[1] || []);
      if (isDoctor) {
        setPatients(results[2].patients || results[2] || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load report data. Ensure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  // ─── Computed Metrics ───
  const consultationSales = sales.filter(s => s.sale_type === 'Consultation');
  const walkInSales = sales.filter(s => s.sale_type !== 'Consultation');
  const lowStockMeds = medicines.filter(m => m.quantity < 10);
  const today = new Date();
  const expiringMeds = medicines.filter(m => {
    if (!m.expiry_date) return false;
    const expiry = new Date(m.expiry_date);
    return (expiry - today) / (1000 * 60 * 60 * 24) <= 30;
  });

  // ─── Medicine-wise dispensing breakdown ───
  const medicineSalesMap = {};
  sales.forEach(s => {
    const key = s.medicine_name || 'Unknown';
    if (!medicineSalesMap[key]) {
      medicineSalesMap[key] = { medicine: key, units: 0 };
    }
    medicineSalesMap[key].units += parseInt(s.quantity_sold || 0);
  });
  const medicineSalesRows = Object.values(medicineSalesMap).sort((a, b) => b.units - a.units);

  const medSalesHeaders = [
    { key: 'medicine', label: 'Medicine Name' },
    { key: 'units', label: 'Units Dispensed' }
  ];

  const renderMedSaleRow = (row, idx) => (
    <tr key={idx}>
      <td style={{ fontWeight: 600 }}>{row.medicine.toUpperCase()}</td>
      <td><strong>{row.units} units</strong></td>
    </tr>
  );

  return (
    <div className={styles.reportsContainer}>
      {/* ─── PAGE HEADER ─── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>
            <BarChart2 size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Clinic Reports &amp; Analytics
          </h2>
          <p className={styles.pageSubtitle}>Operational summaries for clinic management and decision support.</p>
        </div>
      </div>

      {/* ─── DATE FILTER ─── */}
      {/* ─── DATE FILTER ─── */}
      <div className={styles.filterBar}>
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
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ─── KPI STAT CARDS ─── */}
      {!loading && (
        <>
          <section className={styles.statsGrid}>
            <StatCard
              title="Dispensed Transactions"
              value={sales.length}
              icon={<TrendingUp size={20} />}
              color="var(--primary)"
            />
            {isDoctor && (
              <StatCard
                title="Total Patients"
                value={patients.length}
                icon={<Users size={20} />}
                color="var(--primary-light)"
              />
            )}
            <StatCard
              title="Low Stock Items"
              value={lowStockMeds.length}
              icon={<Pill size={20} />}
              color="var(--warning)"
            />
          </section>

          {/* ─── DISPENSING & INVENTORY BREAKDOWN ─── */}
          <section className={styles.breakdownGrid}>
            <div className={styles.breakdownCard}>
              <h4 className={styles.cardTitle}>Dispensing Breakdown</h4>
              <div className={styles.breakdownRows}>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Consultation (Prescription)</span>
                  <span className={styles.breakdownValue}>
                    {consultationSales.length} times
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Direct Dispensing</span>
                  <span className={styles.breakdownValue}>
                    {walkInSales.length} times
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.breakdownCard}>
              <h4 className={styles.cardTitle}>Inventory Status</h4>
              <div className={styles.breakdownRows}>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Total Medicine Items</span>
                  <span className={styles.breakdownValue}>{medicines.length} items</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Low Stock (&lt;10 units)</span>
                  <span className={styles.breakdownValue} style={{ color: 'var(--warning)', fontWeight: 700 }}>
                    {lowStockMeds.length} items
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Near Expiry (&lt;30 days)</span>
                  <span className={styles.breakdownValue} style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    {expiringMeds.length} items
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ─── MEDICINE SALES TABLE ─── */}
          <section className={styles.tableSection}>
            <h4 className={styles.tableSectionTitle}>Medicine Dispensing Summary Report</h4>
            {medicineSalesRows.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No dispensing logs found for selected date range.
              </div>
            ) : (
              <Table
                headers={medSalesHeaders}
                data={medicineSalesRows}
                renderRow={renderMedSaleRow}
                emptyMessage="No medicine dispensing data for this period."
              />
            )}
          </section>

          {/* ─── EXPIRING MEDICINES LIST ─── */}
          {expiringMeds.length > 0 && (
            <section className={styles.tableSection}>
              <h4 className={styles.tableSectionTitle} style={{ color: 'var(--danger)' }}>
                ⚠️ Near-Expiry Medicines (Requires Attention)
              </h4>
              <Table
                headers={[
                  { key: 'medicine_name', label: 'Medicine' },
                  { key: 'quantity', label: 'Stock' },
                  { key: 'expiry_date', label: 'Expiry Date' },
                  { key: 'supplier_name', label: 'Supplier' }
                ]}
                data={expiringMeds}
                renderRow={(med, idx) => {
                  const expiry = new Date(med.expiry_date);
                  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={med.medicine_id || idx}>
                      <td style={{ fontWeight: 600 }}>{med.medicine_name.toUpperCase()}</td>
                      <td>{med.quantity} units</td>
                      <td>
                        <span style={{ color: daysLeft <= 7 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                          {expiry.toLocaleDateString()} ({daysLeft}d left)
                        </span>
                      </td>
                      <td>{med.supplier_name || '-'}</td>
                    </tr>
                  );
                }}
                emptyMessage=""
              />
            </section>
          )}
        </>
      )}

      {loading && (
        <div className="loading-inline" style={{ padding: '48px', justifyContent: 'center' }}>
          <span className="spinner"></span> Compiling clinic report data...
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
