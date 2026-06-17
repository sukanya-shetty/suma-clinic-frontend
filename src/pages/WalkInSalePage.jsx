import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, CheckCircle, ReceiptText } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { salesService } from '../services/salesService';
import styles from './WalkInSalePage.module.css';

const WalkInSalePage = () => {
  const [medicines, setMedicines] = useState([]);
  const [cart, setCart] = useState([
    { medicine_id: '', quantity_sold: 1 }
  ]);
  const [loading, setLoading] = useState(false);
  const [medsLoading, setMedsLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null); // holds last sale invoice

  useEffect(() => {
    const fetchMeds = async () => {
      try {
        const res = await inventoryService.getAllMedicines();
        setMedicines(res.medicines || res || []);
      } catch (err) {
        setError('Failed to load medicine catalog from server.');
      } finally {
        setMedsLoading(false);
      }
    };
    fetchMeds();
  }, []);

  const addRow = () => {
    setCart([...cart, { medicine_id: '', quantity_sold: 1 }]);
  };

  const removeRow = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    const updated = [...cart];
    updated[idx][field] = value;
    setCart(updated);
  };

  const getMedInfo = (medicine_id) => {
    return medicines.find(m => m.medicine_id === parseInt(medicine_id));
  };



  const handleSubmitSales = async (e) => {
    e.preventDefault();
    setError('');

    // Validate each cart row
    for (let i = 0; i < cart.length; i++) {
      const row = cart[i];
      if (!row.medicine_id) {
        setError(`Row ${i + 1}: Please select a medicine.`);
        return;
      }
      const qty = parseInt(row.quantity_sold);
      if (isNaN(qty) || qty <= 0) {
        setError(`Row ${i + 1}: Quantity must be a positive number.`);
        return;
      }
      const med = getMedInfo(row.medicine_id);
      if (med && qty > med.quantity) {
        setError(`Row ${i + 1}: Insufficient stock for ${med.medicine_name}. Only ${med.quantity} available.`);
        return;
      }
    }

    setLoading(true);
    const receiptItems = [];

    try {
      for (const row of cart) {
        const res = await salesService.createSale({
          medicine_id: parseInt(row.medicine_id),
          quantity_sold: parseInt(row.quantity_sold),
          sale_type: 'Direct Walk-in'
        });
        receiptItems.push(res.sale);
      }

      setReceipt(receiptItems);
      setCart([{ medicine_id: '', quantity_sold: 1 }]);

      // Refresh medicine list (stock levels changed)
      const medsRes = await inventoryService.getAllMedicines();
      setMedicines(medsRes.medicines || medsRes || []);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to process one or more sale transactions.');
    } finally {
      setLoading(false);
    }
  };

  const newSale = () => {
    setReceipt(null);
    setError('');
  };

  // ─── Receipt View ───
  if (receipt) {
    return (
      <div className={styles.receiptContainer}>
        <div className={styles.receiptCard}>
          <div className={styles.receiptHeader}>
            <CheckCircle size={40} color="var(--success)" />
            <h3 className={styles.receiptTitle}>Dispensing Completed!</h3>
            <p className={styles.receiptSubtitle}>Medicine has been successfully dispensed. Below is a summary.</p>
          </div>

          <div className={styles.receiptClinic}>
            <strong>Suma Clinic Pharmacy</strong>
            <span>Direct Dispensing Log Summary</span>
            <span>{new Date().toLocaleString()}</span>
          </div>

          <table className={styles.receiptTable}>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {receipt.map((item, idx) => (
                <tr key={idx}>
                  <td>{(item.medicine_name || '').toUpperCase()}</td>
                  <td><strong>{item.quantity_sold} units</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={newSale}>
            <Plus size={16} /> Dispense More Medicine
          </button>
        </div>
      </div>
    );
  }

  // ─── Cart View ───
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>
          <ShoppingCart size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Direct Medicine Dispensing
        </h2>
        <p className={styles.pageSubtitle}>
          Dispense medicines directly to walk-in patients. Stock deducts automatically.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmitSales} className={styles.cartForm}>
        <div className={styles.cartHeader}>
          <h4 className={styles.cartTitle}>Medicine List</h4>
          <button type="button" className="btn btn-secondary" onClick={addRow} disabled={loading}>
            <Plus size={16} /> Add Medicine Row
          </button>
        </div>

        {medsLoading ? (
          <div className="loading-inline" style={{ padding: '24px 0' }}>
            <span className="spinner"></span> Loading medicine catalog...
          </div>
        ) : (
          <div className={styles.cartRows}>
            {cart.map((row, idx) => {
              const med = getMedInfo(row.medicine_id);
              return (
                <div key={idx} className={styles.cartRow}>
                  <div className={styles.selectGroup}>
                    <label className={styles.rowLabel}>Medicine *</label>
                    <select
                      className="form-control"
                      value={row.medicine_id}
                      onChange={e => updateRow(idx, 'medicine_id', e.target.value)}
                      disabled={loading}
                      required
                    >
                      <option value="">-- Select Medicine --</option>
                      {medicines.map(m => (
                        <option key={m.medicine_id} value={m.medicine_id}>
                          {m.medicine_name.toUpperCase()} (Available: {m.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.qtyGroup}>
                    <label className={styles.rowLabel}>Quantity *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max={med ? med.quantity : 9999}
                      value={row.quantity_sold}
                      onChange={e => updateRow(idx, 'quantity_sold', e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeRow(idx)}
                    disabled={loading || cart.length === 1}
                    title="Remove row"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── CART SUMMARY ─── */}
        <div className={styles.cartSummary}>
          <div className={styles.summaryInfo}>
            <span>{cart.filter(r => r.medicine_id).length} item(s) selected</span>
          </div>
        </div>

        <div className={styles.submitRow}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '220px', height: '44px' }}
            disabled={loading || medsLoading}
          >
            <CheckCircle size={16} />
            <span>{loading ? 'Processing Dispensing...' : 'Complete Dispensing'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default WalkInSalePage;
