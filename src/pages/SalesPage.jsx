import React, { useState, useEffect } from 'react';
import { salesService } from '../services/salesService';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import styles from './SalesPage.module.css';

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    // Default: 1st of current month
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default: Today
    return new Date().toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    loadSales();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadSales();
  };

  const calculateTotalRevenue = () => {
    return sales.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
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

  const formatSaleDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
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

  return (
    <div className={styles.salesCard}>
      <div className={styles.headerSection}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Pharmacy Sales Logs</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Overview of all medicine billing transactions and sales.
        </p>
      </div>

      {/* ─── FILTERS PANEL ─── */}
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

      {/* ─── REVENUE OVERVIEW SUMMARY ─── */}
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

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-inline" style={{ padding: '32px 0' }}>
          <span className="spinner"></span> Loading transactions data...
        </div>
      ) : (
        <Table 
          headers={salesHeaders}
          data={sales}
          renderRow={renderSaleRow}
          emptyMessage="No billing records found for the specified date range."
        />
      )}
    </div>
  );
};

export default SalesPage;
