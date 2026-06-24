import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, AlertTriangle, Pill } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { AuthContext } from '../context/AuthContext';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import styles from './InventoryPage.module.css';

const InventoryPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user && user.role === 'Admin';

  const [medicines, setMedicines] = useState([]);
  const [filteredMeds, setFilteredMeds] = useState([]);
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Low' | 'Expiring'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medForm, setMedForm] = useState({
    name: '',
    price: '',
    quantity: '',
    expiryDate: '',
    batch_number: '',
    supplier_name: '',
    purchase_price: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const location = useLocation();

  // Load Inventory
  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await inventoryService.getAllMedicines();
      const meds = res.medicines || res || [];
      setMedicines(meds);
      applyFilter(meds, activeTab);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve store inventory catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Check query parameters to open modal
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('openAdd') === 'true' && isAdmin) {
      setIsModalOpen(true);
    }
  }, [location, isAdmin]);

  // Apply filters local logic
  const applyFilter = (list, tab) => {
    let result = [...list];
    const today = new Date();

    if (tab === 'Low') {
      result = result.filter(m => m.quantity < 10);
    } else if (tab === 'Expiring') {
      result = result.filter(m => {
        if (!m.expiry_date) return false;
        const expiry = new Date(m.expiry_date);
        const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      });
    }
    setFilteredMeds(result);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    applyFilter(medicines, tab);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const { name, quantity, expiryDate, batch_number, supplier_name } = medForm;

    if (!name || !quantity || !expiryDate) {
      setFormError('Name, Quantity, and Expiry Date are required.');
      return;
    }

    const pr = 1.0; // default selling price to satisfy backend positive price requirement
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be a positive number.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: name.trim(),
        price: pr,
        quantity: qty,
        expiryDate,
        batch_number: batch_number.trim() || null,
        supplier_name: supplier_name.trim() || null,
        purchase_price: null
      };

      const res = await inventoryService.addMedicine(payload);
      if (res.medicine) {
        setFormSuccess(res.message || 'Stock updated successfully!');
        setMedForm({
          name: '',
          price: '',
          quantity: '',
          expiryDate: '',
          batch_number: '',
          supplier_name: '',
          purchase_price: ''
        });
        loadInventory();
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error || 'Failed to replenish inventory.');
    } finally {
      setFormLoading(false);
    }
  };

  const getRowHighlightClass = (expiryDateStr) => {
    if (!expiryDateStr) return '';
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);

    if (diffDays <= 0) return styles.rowExpired;
    if (diffDays <= 30) return styles.rowExpiring;
    return '';
  };

  const medHeaders = [
    { key: 'medicine_name', label: 'Medicine Name' },
    { key: 'quantity', label: 'Qty' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'batch_number', label: 'Batch' },
    { key: 'supplier_name', label: 'Supplier' }
  ];

  const renderMedicineRow = (med, index) => {
    const highlightClass = getRowHighlightClass(med.expiry_date);
    
    return (
      <tr key={med.medicine_id || index} className={highlightClass}>
        <td style={{ fontWeight: 600 }}>{med.medicine_name.toUpperCase()}</td>
        <td>
          <strong style={{ color: med.quantity < 10 ? 'var(--warning)' : 'inherit' }}>
            {med.quantity}
          </strong> units
        </td>
        <td>{med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : '-'}</td>
        <td>{med.batch_number || '-'}</td>
        <td>{med.supplier_name || '-'}</td>
      </tr>
    );
  };

  return (
    <div className={styles.inventoryCard}>
      <div className={styles.headerSection}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Medicine Catalog & Stock</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Add Medicine</span>
          </button>
        )}
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.filterTabs}>
          {['All', 'Low', 'Expiring'].map(tab => (
            <button 
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
            >
              {tab === 'All' && 'All Medicines'}
              {tab === 'Low' && 'Low Stock (<10)'}
              {tab === 'Expiring' && 'Near Expiry (<30d)'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-inline" style={{ padding: '32px 0' }}>
          <span className="spinner"></span> Loading stock items...
        </div>
      ) : (
        <Table 
          headers={medHeaders}
          data={filteredMeds}
          renderRow={renderMedicineRow}
          emptyMessage="No medicines match the selected filter tab."
        />
      )}

      {/* ─── ADD MEDICINE MODAL ─── */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setFormError(''); setFormSuccess(''); }}
        title="Replenish Store Medicine"
      >
        <form onSubmit={handleAddSubmit}>
          {formError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{formError}</div>}
          {formSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{formSuccess}</div>}

          <div className="form-group">
            <label htmlFor="name">Medicine Name *</label>
            <input 
              type="text" 
              id="name"
              className="form-control"
              placeholder="e.g. Metformin / Paracetamol"
              value={medForm.name}
              onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
              disabled={formLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity Added *</label>
            <input 
              type="number" 
              id="quantity"
              className="form-control"
              placeholder="e.g. 100"
              value={medForm.quantity}
              onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })}
              disabled={formLoading}
              required
            />
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label htmlFor="expiryDate">Expiry Date *</label>
              <input 
                type="date" 
                id="expiryDate"
                className="form-control"
                value={medForm.expiryDate}
                onChange={(e) => setMedForm({ ...medForm, expiryDate: e.target.value })}
                disabled={formLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="batch_number">Batch Number</label>
              <input 
                type="text" 
                id="batch_number"
                className="form-control"
                placeholder="e.g. BATCH-334"
                value={medForm.batch_number}
                onChange={(e) => setMedForm({ ...medForm, batch_number: e.target.value })}
                disabled={formLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="supplier_name">Supplier Name</label>
            <input 
              type="text" 
              id="supplier_name"
              className="form-control"
              placeholder="e.g. MediSupply Ltd."
              value={medForm.supplier_name}
              onChange={(e) => setMedForm({ ...medForm, supplier_name: e.target.value })}
              disabled={formLoading}
            />
          </div>

          <div className={styles.modalFooter}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => { setIsModalOpen(false); setFormError(''); setFormSuccess(''); }}
              disabled={formLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={formLoading}
            >
              {formLoading ? 'Updating Store...' : 'Replenish Inventory'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
