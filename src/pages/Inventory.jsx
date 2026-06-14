import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  PlusCircle, 
  Search, 
  Pill, 
  AlertTriangle, 
  Calendar,
  Layers,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import './Inventory.css';

const Inventory = () => {
  const userRole = localStorage.getItem('role') || 'Staff';
  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 1. Core States
  const [medicines, setMedicines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'low', 'expiring'
  const [loading, setLoading] = useState(false);

  // 2. Add/Replenish Medicine Form States
  const [showFormModal, setShowFormModal] = useState(false);
  const [medForm, setMedForm] = useState({
    name: '',
    price: '',
    quantity: '',
    expiryDate: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // 3. Notification Toast
  const [notification, setNotification] = useState(null);

  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 4. Fetch Stock Data
  const loadInventory = async () => {
    setLoading(true);
    try {
      const [medsRes, alertsRes] = await Promise.all([
        axios.get('http://127.0.0.1:3001/api/inventory/medicines', authHeaders),
        axios.get('http://127.0.0.1:3001/api/inventory/alerts', authHeaders)
      ]);
      setMedicines(medsRes.data.medicines || []);
      setAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.error(err);
      triggerNotification('danger', 'Failed to retrieve inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // 5. Submit New Stock Batch (Upsert method)
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const { name, price, quantity, expiryDate } = medForm;

    if (!name || !price || !quantity || !expiryDate) {
      setFormError('Please fill in all fields.');
      return;
    }

    const pr = parseFloat(price);
    const qty = parseInt(quantity);

    if (isNaN(pr) || pr <= 0 || isNaN(qty) || qty <= 0) {
      setFormError('Price and quantity must be positive numbers.');
      return;
    }

    setFormSubmitting(true);

    try {
      const res = await axios.post(
        'http://127.0.0.1:3001/api/inventory/medicines',
        {
          name: name.trim(),
          price: pr,
          quantity: qty,
          expiryDate
        },
        authHeaders
      );

      if (res.status === 201 || res.status === 200) {
        setFormSuccess(res.status === 201 ? 'Medicine registered successfully!' : 'Medicine stock replenished successfully!');
        triggerNotification('success', 'Stock list updated.');
        setMedForm({
          name: '',
          price: '',
          quantity: '',
          expiryDate: ''
        });
        loadInventory();
        setTimeout(() => setShowFormModal(false), 1500);
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to submit inventory updates.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // 6. Delete Medicine (Doctor-only)
  const handleDeleteMedicine = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name.toUpperCase()} from the store catalog?`)) {
      return;
    }

    try {
      const res = await axios.delete(`http://127.0.0.1:3001/api/inventory/medicines/${id}`, authHeaders);
      if (res.status === 200) {
        triggerNotification('success', `${name.toUpperCase()} removed from store.`);
        loadInventory();
      }
    } catch (err) {
      triggerNotification('danger', err.response?.data?.error || 'Unauthorized deletion.');
    }
  };

  // 7. Filters and Search
  const filteredMeds = medicines.filter(m => {
    const matchesSearch = m.medicine_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'low') {
      return matchesSearch && m.quantity < 10;
    }
    if (filterType === 'expiring') {
      const daysLeft = (new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
      return matchesSearch && daysLeft <= 30;
    }
    return matchesSearch;
  });

  return (
    <div className="inventory-panel">
      
      {/* Toast Notification Alert */}
      {notification && (
        <div className={`toast-notification ${notification.type} animate-fade-in`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ─── ROW 1: QUICK INVENTORY STATS ─── */}
      <section className="inventory-header-stats animate-fade-in">
        
        {/* Total Stock */}
        <div className={`stat-box glass-card ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>
          <div className="stat-icon-box blue"><Pill size={20} /></div>
          <div className="stat-text">
            <p className="stat-val">{medicines.length}</p>
            <p className="stat-lbl">Active Medicines</p>
          </div>
        </div>

        {/* Low Stock count */}
        <div className={`stat-box glass-card ${filterType === 'low' ? 'active' : ''}`} onClick={() => setFilterType('low')}>
          <div className="stat-icon-box orange"><AlertTriangle size={20} /></div>
          <div className="stat-text">
            <p className="stat-val">{medicines.filter(m => m.quantity < 10).length}</p>
            <p className="stat-lbl">Low Stock Alerts</p>
          </div>
        </div>

        {/* Expiring Count */}
        <div className={`stat-box glass-card ${filterType === 'expiring' ? 'active' : ''}`} onClick={() => setFilterType('expiring')}>
          <div className="stat-icon-box red"><Calendar size={20} /></div>
          <div className="stat-text">
            <p className="stat-val">
              {medicines.filter(m => {
                const daysLeft = (new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
                return daysLeft <= 30;
              }).length}
            </p>
            <p className="stat-lbl">Near Expiry (&lt; 30d)</p>
          </div>
        </div>

      </section>

      {/* ─── ROW 2: CONTROLS & GRID ─── */}
      <section className="inventory-content-box glass-card animate-fade-in">
        
        {/* Toolbar Header */}
        <div className="toolbar-header">
          
          {/* Search Box */}
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search store inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-btn"><Search size={18} /></button>
          </div>

          {/* Actions Button */}
          <button onClick={() => setShowFormModal(true)} className="reg-btn-trigger add-med-trigger">
            <PlusCircle size={18} />
            <span>Add Medicine / Batch</span>
          </button>

        </div>

        {/* Inventory Table List */}
        <div className="table-wrapper">
          {loading ? (
            <div className="dir-loading"><span className="spinner"></span></div>
          ) : filteredMeds.length === 0 ? (
            <div className="feed-empty">
              <Inbox size={42} className="empty-icon" />
              <p>No medicines found matching the active filters.</p>
            </div>
          ) : (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Med ID</th>
                  <th>Medicine Name</th>
                  <th>Selling Price</th>
                  <th>Current Stock</th>
                  <th>Expiry Date</th>
                  <th>Status Status</th>
                  {userRole === 'Doctor' && <th style={{textAlign: 'center'}}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMeds.map((med) => {
                  const isLow = med.quantity < 10;
                  
                  // Expiry warnings
                  const daysLeft = (new Date(med.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
                  const isExpired = daysLeft <= 0;
                  const isNearExpiry = daysLeft > 0 && daysLeft <= 30;

                  return (
                    <tr key={med.medicine_id} className={isExpired ? 'row-expired' : ''}>
                      <td>#{med.medicine_id}</td>
                      <td><strong>{med.medicine_name.toUpperCase()}</strong></td>
                      <td>${parseFloat(med.price).toFixed(2)}</td>
                      <td>
                        <strong className={isLow ? 'text-warn' : ''}>{med.quantity}</strong> units
                      </td>
                      <td className={isExpired ? 'text-danger' : isNearExpiry ? 'text-warn' : ''}>
                        {new Date(med.expiry_date).toLocaleDateString()}
                      </td>
                      <td>
                        {isExpired && <span className="status-pill red">Expired</span>}
                        {isNearExpiry && <span className="status-pill orange">Near Expiry</span>}
                        {!isExpired && !isNearExpiry && isLow && <span className="status-pill orange">Low Stock</span>}
                        {!isExpired && !isNearExpiry && !isLow && <span className="status-pill green">Normal</span>}
                      </td>
                      {userRole === 'Doctor' && (
                        <td style={{textAlign: 'center'}}>
                          <button 
                            onClick={() => handleDeleteMedicine(med.medicine_id, med.medicine_name)}
                            className="item-remove-btn"
                            title="Delete Medicine"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </section>

      {/* ─── MODAL: ADD / REPLENISH STOCK ─── */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-card animate-fade-in">
            <div className="modal-header">
              <h3>Register/Add Medicine Batch</h3>
              <button onClick={() => setShowFormModal(false)} className="close-btn"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddMedicine} className="modal-form">
              {formError && <div className="error-box">{formError}</div>}
              {formSuccess && <div className="success-box">{formSuccess}</div>}

              <div className="input-group">
                <label>Medicine Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Paracetamol / Insulin"
                  value={medForm.name}
                  onChange={(e) => setMedForm({...medForm, name: e.target.value})}
                  disabled={formSubmitting}
                />
                <span className="hint-text">If medicine name already exists, the quantity will be added/replenished automatically.</span>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Unit Selling Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 5.50"
                    value={medForm.price}
                    onChange={(e) => setMedForm({...medForm, price: e.target.value})}
                    disabled={formSubmitting}
                  />
                </div>
                <div className="input-group">
                  <label>Quantity added</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 100"
                    value={medForm.quantity}
                    onChange={(e) => setMedForm({...medForm, quantity: e.target.value})}
                    disabled={formSubmitting}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Expiry Date</label>
                <input 
                  type="date"
                  value={medForm.expiryDate}
                  onChange={(e) => setMedForm({...medForm, expiryDate: e.target.value})}
                  disabled={formSubmitting}
                />
              </div>

              <button type="submit" className="login-btn" disabled={formSubmitting}>
                {formSubmitting ? 'Updating Catalog...' : 'Submit Stock Batch'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
