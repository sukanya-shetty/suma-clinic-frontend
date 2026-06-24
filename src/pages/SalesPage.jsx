import React, { useState, useEffect, useContext } from 'react';
import { salesService } from '../services/salesService';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { Printer } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import styles from './SalesPage.module.css';

const SalesPage = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('Sales'); // 'Sales' | 'Bills'
  const [sales, setSales] = useState([]);
  const [bills, setBills] = useState([]);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reprint bill state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billLoading, setBillLoading] = useState(false);

  const loadSales = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await salesService.getAllSales({ startDate, endDate });
      setSales(res.sales || []);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve sales transactions list.');
    } finally {
      setLoading(false);
    }
  };

  const loadBills = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await salesService.getAllBills();
      setBills(res.bills || []);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve generated billing records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Sales') {
      loadSales();
    } else {
      loadBills();
    }
  }, [activeTab]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'Sales') {
      loadSales();
    }
  };

  const calculateTotalRevenue = () => {
    return sales.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
  };

  const openBillReprint = async (billId) => {
    setBillLoading(true);
    setError('');
    try {
      const res = await salesService.getBillDetails(billId);
      if (res.success) {
        setSelectedBill(res.bill);
        setIsBillModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load bill details for reprint.');
    } finally {
      setBillLoading(false);
    }
  };

  const triggerPrintBill = () => {
    window.print();
  };

  const salesHeaders = [
    { key: 'sale_date', label: 'Date/Time' },
    { key: 'patient_name', label: 'Patient / Customer' },
    { key: 'medicine_name', label: 'Medicine' },
    { key: 'quantity_sold', label: 'Qty' },
    { key: 'price_per_unit', label: 'Price' },
    { key: 'total_amount', label: 'Total' },
    { key: 'sale_type', label: 'Sale Type' }
  ];

  const billsHeaders = [
    { key: 'bill_number', label: 'Invoice No.' },
    { key: 'created_at', label: 'Fulfillment Date' },
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'total_amount', label: 'Total Paid' },
    { key: 'actions', label: 'Actions' }
  ];

  const formatSaleDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const normalizedStr = typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(normalizedStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const renderSaleRow = (sale, index) => {
    const isWalkIn = !sale.patient_id;
    return (
      <tr key={sale.sale_id || index}>
        <td>{formatSaleDate(sale.sale_date)}</td>
        <td>
          <span style={{ fontWeight: isWalkIn ? 500 : 700, color: isWalkIn ? 'var(--text-muted)' : 'var(--primary)' }}>
            {isWalkIn ? 'WALK-IN CUSTOMER' : sale.patient_name.toUpperCase()}
          </span>
        </td>
        <td style={{ fontWeight: 600 }}>{sale.medicine_name.toUpperCase()}</td>
        <td>{sale.quantity_sold} units</td>
        <td>${parseFloat(sale.price_per_unit).toFixed(2)}</td>
        <td><strong>${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
        <td>
          <Badge 
            text={sale.sale_type} 
            type={sale.sale_type === 'Consultation' ? 'primary' : 'success'} 
          />
        </td>
      </tr>
    );
  };

  const renderBillRow = (bill, index) => {
    return (
      <tr key={bill.bill_id || index}>
        <td style={{ fontWeight: 600 }}>{bill.bill_number}</td>
        <td>{formatSaleDate(bill.created_at)}</td>
        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{bill.patient_name.toUpperCase()}</td>
        <td><strong>${parseFloat(bill.total_amount).toFixed(2)}</strong></td>
        <td>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => openBillReprint(bill.bill_id)}
          >
            <Printer size={12} /> View/Reprint
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.salesCard}>
      <div className={styles.headerSection}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Pharmacy Sales &amp; Billing History</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Overview of all direct medicine billing transactions, consultations, and generated invoices.
        </p>
      </div>

      {/* ─── TAB SELECTION ─── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button 
          onClick={() => setActiveTab('Sales')}
          style={{
            padding: '10px 20px',
            fontWeight: 600,
            borderBottom: activeTab === 'Sales' ? '2px solid var(--primary)' : 'none',
            color: activeTab === 'Sales' ? 'var(--primary)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Direct Sales Logs
        </button>
        <button 
          onClick={() => setActiveTab('Bills')}
          style={{
            padding: '10px 20px',
            fontWeight: 600,
            borderBottom: activeTab === 'Bills' ? '2px solid var(--primary)' : 'none',
            color: activeTab === 'Bills' ? 'var(--primary)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Invoice &amp; Bill Records
        </button>
      </div>

      {/* ─── FILTERS PANEL (Only for Sales tab) ─── */}
      {activeTab === 'Sales' && (
        <form onSubmit={handleFilterSubmit} className={styles.filtersRow}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="startDate" style={{ fontSize: '0.78rem' }}>Start Date</label>
            <input 
              type="date" 
              id="startDate"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="endDate" style={{ fontSize: '0.78rem' }}>End Date</label>
            <input 
              type="date" 
              id="endDate"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary filterBtn"
            disabled={loading}
          >
            {loading ? 'Filtering...' : 'Apply Filters'}
          </button>
        </form>
      )}

      {/* ─── REVENUE OVERVIEW SUMMARY (Only for Sales tab) ─── */}
      {activeTab === 'Sales' && (
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          marginBottom: '24px',
          padding: '16px',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
          backgroundColor: '#FAFBFD'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtered Transactions</span>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>{sales.length} sales</h4>
          </div>
          <div style={{ width: '1px', backgroundColor: 'var(--border)' }}></div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accumulated Revenue</span>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>${calculateTotalRevenue().toFixed(2)}</h4>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {billLoading && <div className="loading-inline"><span className="spinner"></span> Fetching invoice details...</div>}

      {loading ? (
        <div className="loading-inline" style={{ padding: '32px 0' }}>
          <span className="spinner"></span> Loading history data...
        </div>
      ) : activeTab === 'Sales' ? (
        <Table 
          headers={salesHeaders}
          data={sales}
          renderRow={renderSaleRow}
          emptyMessage="No billing records found for the specified date range."
        />
      ) : (
        <Table 
          headers={billsHeaders}
          data={bills}
          renderRow={renderBillRow}
          emptyMessage="No invoice bill receipts registered in database."
        />
      )}

      {/* ─── INVOICE REPRINT POPUP MODAL ─── */}
      <Modal 
        isOpen={isBillModalOpen}
        onClose={() => { setIsBillModalOpen(false); setSelectedBill(null); }}
        title="Print/View Saved Invoice Receipt"
      >
        {selectedBill && (
          <div>
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
                  <strong>BILL NO:</strong> {selectedBill.bill_number}<br />
                  <strong>PATIENT:</strong> {selectedBill.patient_name.toUpperCase()}<br />
                  <strong>PATIENT ID:</strong> #{selectedBill.patient_id}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>DATE:</strong> {new Date(selectedBill.created_at).toLocaleDateString()}<br />
                  <strong>TIME:</strong> {new Date(selectedBill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  {selectedBill.items && selectedBill.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dashed #eee' }}>
                      <td style={{ padding: '6px 0', fontWeight: 600 }}>{item.medicine_name.toUpperCase()}</td>
                      <td style={{ padding: '6px 0', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>${parseFloat(item.price_per_unit).toFixed(2)}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', fontSize: '1rem', borderTop: '1px solid #333' }}>
                    <td colSpan="3" style={{ padding: '10px 0' }}>GRAND TOTAL</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>${parseFloat(selectedBill.total_amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24 }}>
                <span style={{ fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>Pharmacist Digital Signature:</span>
                {selectedBill.signature_ref ? (
                  <img 
                    src={selectedBill.signature_ref} 
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
              <button className="btn btn-primary" onClick={() => { setIsBillModalOpen(false); setSelectedBill(null); }}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesPage;
