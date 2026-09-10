import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, AlertTriangle, Pill, Download, ArrowUpDown } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { AuthContext } from '../context/AuthContext';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import styles from './InventoryPage.module.css';

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops',
  'Cream', 'Ointment', 'Lotion', 'Gel', 'Powder', 'Sachet',
  'Inhaler', 'Nebules', 'Eye Drops', 'Ear Drops', 'Vaginal Tablet'
];

const CATEGORIES = [
  'Analgesics', 'Antibiotics', 'Antipyretics', 'Anti-inflammatory', 'Antacids',
  'Antihistamines', 'Antifungals', 'Antivirals', 'Antidiabetics', 'Antihypertensives',
  'Vitamins', 'Supplements', 'Respiratory', 'Dermatology', 'Gynecology',
  'Pediatrics', 'Orthopedics', 'Gastrointestinal', 'Cardiology', 'Neurology', 'Ophthalmology'
];

const SPECIALTIES = [
  'General Medicine', 'Pediatrics', 'Orthopedics', 'Gynecology', 'Dermatology'
];

const InventoryPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user && user.role === 'Admin';

  const [medicines, setMedicines] = useState([]);
  const [filteredMeds, setFilteredMeds] = useState([]);
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Low' | 'Expiring' | 'Out' | 'Expired'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDosageForm, setSelectedDosageForm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('medicine_name');
  const [sortOrder, setSortOrder] = useState('ASC');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);

  // Form states
  const [medForm, setMedForm] = useState({
    name: '', generic_name: '', brand_name: '', strength: '', dosage_form: 'Tablet',
    category: 'Analgesics', specialties: [], route: '', manufacturer: '', pack_size: '1',
    unit: '', hsn_code: '', purchase_price: '', price: '', gst_percent: '12',
    min_stock: '10', quantity: '', reorder_level: '15', batch_number: '',
    mfg_date: '', expiry_date: '', storage_condition: '', prescription_required: 'No',
    status: 'Active', description: ''
  });

  const [editForm, setEditForm] = useState({
    name: '', generic_name: '', brand_name: '', strength: '', dosage_form: 'Tablet',
    category: 'Analgesics', specialties: [], route: '', manufacturer: '', pack_size: '1',
    unit: '', hsn_code: '', purchase_price: '', price: '', gst_percent: '12',
    min_stock: '10', quantity: '', reorder_level: '15', batch_number: '',
    mfg_date: '', expiry_date: '', storage_condition: '', prescription_required: 'No',
    status: 'Active', description: ''
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

  // Process filters, sorting, and tab selection locally
  useEffect(() => {
    let result = [...medicines];
    const today = new Date();

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.medicine_name.toLowerCase().includes(q) ||
        (m.generic_name && m.generic_name.toLowerCase().includes(q)) ||
        (m.brand_name && m.brand_name.toLowerCase().includes(q))
      );
    }

    // 2. Dropdown filters
    if (selectedCategory) {
      result = result.filter(m => m.category === selectedCategory);
    }
    if (selectedDosageForm) {
      result = result.filter(m => m.dosage_form === selectedDosageForm);
    }
    if (selectedSpecialty) {
      result = result.filter(m => m.specialties && m.specialties.toLowerCase().includes(selectedSpecialty.toLowerCase()));
    }

    // 3. Tab filter
    if (activeTab === 'Low') {
      result = result.filter(m => m.quantity < (m.min_stock || 10));
    } else if (activeTab === 'Expiring') {
      result = result.filter(m => {
        if (!m.expiry_date) return false;
        const expiry = new Date(m.expiry_date);
        const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);
        return diffDays > 0 && diffDays <= 30;
      });
    } else if (activeTab === 'Out') {
      result = result.filter(m => m.quantity <= 0);
    } else if (activeTab === 'Expired') {
      result = result.filter(m => m.expiry_date && new Date(m.expiry_date) <= today);
    }

    // 4. Sorting
    result.sort((a, b) => {
      let valA = a[sortBy] !== undefined ? a[sortBy] : '';
      let valB = b[sortBy] !== undefined ? b[sortBy] : '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    setFilteredMeds(result);
    setCurrentPage(1); // reset to first page on filter change
  }, [medicines, searchQuery, selectedCategory, selectedDosageForm, selectedSpecialty, activeTab, sortBy, sortOrder]);

  // Open add medicine modal from query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('openAdd') === 'true' && isAdmin) {
      setIsModalOpen(true);
    }
  }, [location, isAdmin]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const {
      name, generic_name, brand_name, strength, dosage_form,
      category, specialties, route, manufacturer, pack_size,
      unit, hsn_code, purchase_price, price, gst_percent,
      min_stock, quantity, reorder_level, batch_number,
      mfg_date, expiry_date, storage_condition, prescription_required,
      status, description
    } = medForm;

    // Required fields validation
    if (!name || !price || quantity === undefined || !expiry_date || !dosage_form) {
      setFormError('Name, Selling Price, Quantity, Dosage Form, and Expiry Date are required.');
      return;
    }

    const pr = parseFloat(price);
    const pPr = parseFloat(purchase_price || 0);
    const qty = parseInt(quantity);

    if (qty < 0) {
      setFormError('Stock quantity cannot be negative.');
      return;
    }

    if (pr < pPr) {
      setFormError('Selling price cannot be lower than purchase price.');
      return;
    }

    if (mfg_date && expiry_date && new Date(expiry_date) <= new Date(mfg_date)) {
      setFormError('Expiry date must be later than manufacturing date.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: name.trim(),
        generic_name: generic_name.trim() || null,
        brand_name: brand_name.trim() || null,
        strength: strength.trim() || null,
        dosage_form,
        category,
        specialties: specialties.join(', '),
        route: route.trim() || null,
        manufacturer: manufacturer.trim() || null,
        pack_size: parseInt(pack_size) || 1,
        unit: unit.trim() || null,
        hsn_code: hsn_code.trim() || null,
        purchase_price: pPr,
        price: pr,
        gst_percent: parseFloat(gst_percent) || 0,
        min_stock: parseInt(min_stock) || 10,
        quantity: qty,
        reorder_level: parseInt(reorder_level) || 15,
        batch_number: batch_number.trim() || null,
        mfg_date: mfg_date || null,
        expiry_date,
        storage_condition: storage_condition.trim() || null,
        prescription_required,
        status,
        description: description.trim() || null
      };

      const res = await inventoryService.addMedicine(payload);
      setFormSuccess(res.message || 'Medicine added successfully!');
      loadInventory();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error || 'Failed to replenish inventory.');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (med) => {
    setEditingMedicine(med);
    setEditForm({
      name: med.medicine_name || '',
      generic_name: med.generic_name || '',
      brand_name: med.brand_name || '',
      strength: med.strength || '',
      dosage_form: med.dosage_form || 'Tablet',
      category: med.category || 'Analgesics',
      specialties: med.specialties ? med.specialties.split(', ').map(s => s.trim()) : [],
      route: med.route || '',
      manufacturer: med.manufacturer || '',
      pack_size: String(med.pack_size || 1),
      unit: med.unit || '',
      hsn_code: med.hsn_code || '',
      purchase_price: String(med.purchase_price || 0),
      price: String(med.price || 0),
      gst_percent: String(med.gst_percent || 12),
      min_stock: String(med.min_stock || 10),
      quantity: String(med.quantity || 0),
      reorder_level: String(med.reorder_level || 15),
      batch_number: med.batch_number || '',
      mfg_date: med.mfg_date ? new Date(med.mfg_date).toISOString().split('T')[0] : '',
      expiry_date: med.expiry_date ? new Date(med.expiry_date).toISOString().split('T')[0] : '',
      storage_condition: med.storage_condition || '',
      prescription_required: med.prescription_required || 'No',
      status: med.status || 'Active',
      description: med.description || ''
    });
    setFormError('');
    setFormSuccess('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const {
      name, generic_name, brand_name, strength, dosage_form,
      category, specialties, route, manufacturer, pack_size,
      unit, hsn_code, purchase_price, price, gst_percent,
      min_stock, quantity, reorder_level, batch_number,
      mfg_date, expiry_date, storage_condition, prescription_required,
      status, description
    } = editForm;

    if (!name || !price || quantity === undefined || !expiry_date || !dosage_form) {
      setFormError('Name, Selling Price, Quantity, Dosage Form, and Expiry Date are required.');
      return;
    }

    const pr = parseFloat(price);
    const pPr = parseFloat(purchase_price || 0);
    const qty = parseInt(quantity);

    if (qty < 0) {
      setFormError('Stock quantity cannot be negative.');
      return;
    }

    if (pr < pPr) {
      setFormError('Selling price cannot be lower than purchase price.');
      return;
    }

    if (mfg_date && expiry_date && new Date(expiry_date) <= new Date(mfg_date)) {
      setFormError('Expiry date must be later than manufacturing date.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: name.trim(),
        generic_name: generic_name.trim() || null,
        brand_name: brand_name.trim() || null,
        strength: strength.trim() || null,
        dosage_form,
        category,
        specialties: specialties.join(', '),
        route: route.trim() || null,
        manufacturer: manufacturer.trim() || null,
        pack_size: parseInt(pack_size) || 1,
        unit: unit.trim() || null,
        hsn_code: hsn_code.trim() || null,
        purchase_price: pPr,
        price: pr,
        gst_percent: parseFloat(gst_percent) || 0,
        min_stock: parseInt(min_stock) || 10,
        quantity: qty,
        reorder_level: parseInt(reorder_level) || 15,
        batch_number: batch_number.trim() || null,
        mfg_date: mfg_date || null,
        expiry_date,
        storage_condition: storage_condition.trim() || null,
        prescription_required,
        status,
        description: description.trim() || null
      };

      await inventoryService.updateMedicineDetails(editingMedicine.medicine_id, payload);
      setFormSuccess('Medicine details updated successfully!');
      loadInventory();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditingMedicine(null);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error || 'Failed to update medicine details.');
    } finally {
      setFormLoading(false);
    }
  };

  const getRowHighlightClass = (med) => {
    const today = new Date();
    if (med.expiry_date && new Date(med.expiry_date) <= today) {
      return styles.rowExpired;
    }
    if (med.expiry_date) {
      const expiry = new Date(med.expiry_date);
      const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);
      if (diffDays > 0 && diffDays <= 30) return styles.rowExpiring;
    }
    return '';
  };

  const exportToCSV = () => {
    const headers = [
      'Medicine Name', 'Generic Name', 'Brand Name', 'Strength', 'Dosage Form',
      'Category', 'Specialties', 'Route', 'Manufacturer', 'Pack Size', 'Unit',
      'HSN Code', 'Purchase Price (INR)', 'Selling Price (INR)', 'GST %',
      'Current Stock', 'Min Stock', 'Reorder Level', 'Batch Number',
      'Mfg Date', 'Expiry Date', 'Prescription Required', 'Status'
    ];

    const rows = filteredMeds.map(m => [
      m.medicine_name, m.generic_name || '', m.brand_name || '', m.strength || '', m.dosage_form || '',
      m.category || '', m.specialties || '', m.route || '', m.manufacturer || '', m.pack_size || 1, m.unit || '',
      m.hsn_code || '', m.purchase_price || 0, m.price || 0, m.gst_percent || 0,
      m.quantity || 0, m.min_stock || 10, m.reorder_level || 15, m.batch_number || '',
      m.mfg_date ? new Date(m.mfg_date).toISOString().split('T')[0] : '',
      m.expiry_date ? new Date(m.expiry_date).toISOString().split('T')[0] : '',
      m.prescription_required || 'No', m.status || 'Active'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `suma_clinic_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSpecialtyCheckboxChange = (formName, spec, isChecked) => {
    const setter = formName === 'add' ? setMedForm : setEditForm;
    const form = formName === 'add' ? medForm : editForm;
    
    if (isChecked) {
      setter({ ...form, specialties: [...form.specialties, spec] });
    } else {
      setter({ ...form, specialties: form.specialties.filter(s => s !== spec) });
    }
  };

  // Local Pagination Calculations
  const totalItems = filteredMeds.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMeds = filteredMeds.slice(startIndex, startIndex + pageSize);

  const medHeaders = [
    { key: 'medicine_name', label: 'Medicine Name' },
    { key: 'dosage_form', label: 'Form' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Stock Qty' },
    { key: 'price', label: 'Price (₹)' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'batch_number', label: 'Batch' },
    ...(isAdmin ? [{ key: 'actions', label: 'Actions' }] : [])
  ];

  const renderMedicineRow = (med, index) => {
    const highlightClass = getRowHighlightClass(med);
    const isOutOfStock = med.quantity <= 0;
    const isLowStock = med.quantity < (med.min_stock || 10);
    
    return (
      <tr key={med.medicine_id || index} className={highlightClass}>
        <td style={{ fontWeight: 600 }}>
          <div>{med.medicine_name.toUpperCase()}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            {med.generic_name ? `Gen: ${med.generic_name}` : ''} {med.brand_name ? `| Brand: ${med.brand_name}` : ''}
          </div>
        </td>
        <td>{med.dosage_form || '-'}</td>
        <td>{med.category || '-'}</td>
        <td>
          <strong style={{ color: isOutOfStock ? '#ef4444' : isLowStock ? 'var(--warning)' : 'inherit' }}>
            {med.quantity}
          </strong> {med.unit || 'units'}
          {isOutOfStock && <div style={{ fontSize: '0.68rem', color: '#ef4444' }}>Out of Stock</div>}
          {!isOutOfStock && isLowStock && <div style={{ fontSize: '0.68rem', color: 'var(--warning)' }}>Low Stock</div>}
        </td>
        <td>₹{parseFloat(med.price || 0).toFixed(2)}</td>
        <td>{med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : '-'}</td>
        <td>{med.batch_number || '-'}</td>
        {isAdmin && (
          <td>
            <button 
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={() => openEditModal(med)}
            >
              Update
            </button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className={styles.inventoryCard}>
      {/* Page Header */}
      <div className={styles.headerSection}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Medicine Master &amp; Stock Inventory</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Comprehensive store catalogue, reorder alerts, and detailed medicine attributes database.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <Download size={16} style={{ marginRight: 6 }} /> Export CSV
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} style={{ marginRight: 6 }} /> Add Medicine
            </button>
          )}
        </div>
      </div>

      {/* Real-time Tabs */}
      <div className={styles.controlsRow}>
        <div className={styles.filterTabs}>
          {[
            { id: 'All', label: 'All Medicines' },
            { id: 'Low', label: 'Low Stock Alerts' },
            { id: 'Expiring', label: 'Near Expiry' },
            { id: 'Out', label: 'Out of Stock' },
            { id: 'Expired', label: 'Expired' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: 'var(--radius)',
        marginBottom: '20px',
        border: '1px solid var(--border)'
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Search Medicine / Generic / Brand</label>
          <input 
            type="text"
            className="form-control"
            placeholder="Type name to lookup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Specialty Filter</label>
          <select 
            className="form-control"
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
          >
            <option value="">All Specialties</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Category Filter</label>
          <select 
            className="form-control"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Dosage Form Filter</label>
          <select 
            className="form-control"
            value={selectedDosageForm}
            onChange={(e) => setSelectedDosageForm(e.target.value)}
          >
            <option value="">All Dosage Forms</option>
            {DOSAGE_FORMS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Medicines Table */}
      {loading ? (
        <div className="loading-inline" style={{ padding: '32px 0' }}>
          <span className="spinner"></span> Loading stock items...
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-dark)', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', fontWeight: 'bold' }}>
                <th onClick={() => handleSort('medicine_name')} style={{ padding: '12px 8px', cursor: 'pointer' }}>
                  Medicine Name <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('dosage_form')} style={{ padding: '12px 8px', cursor: 'pointer' }}>
                  Dosage Form <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('category')} style={{ padding: '12px 8px', cursor: 'pointer' }}>
                  Category <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('quantity')} style={{ padding: '12px 8px', cursor: 'pointer' }}>
                  Stock Qty <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('price')} style={{ padding: '12px 8px', cursor: 'pointer' }}>
                  Price (₹) <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('expiry_date')} style={{ padding: '12px 8px', cursor: 'pointer' }}>
                  Expiry Date <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th style={{ padding: '12px 8px' }}>Batch</th>
                {isAdmin && <th style={{ padding: '12px 8px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedMeds.length > 0 ? paginatedMeds.map((med, idx) => renderMedicineRow(med, idx)) : (
                <tr>
                  <td colSpan={medHeaders.length} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No medicines match the selected filter/search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalItems)} of {totalItems} items
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, padding: '0 8px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  className="btn btn-secondary" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── ADD MEDICINE MODAL ─── */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setFormError(''); setFormSuccess(''); }}
        title="Create Medicine Master Profile"
      >
        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {formError && <div className="alert alert-danger" style={{ marginBottom: 8 }}>{formError}</div>}
          {formSuccess && <div className="alert alert-success" style={{ marginBottom: 8 }}>{formSuccess}</div>}

          {/* Basic Information */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>1. Basic Identification</h4>
          </div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Medicine Name *</label>
              <input type="text" className="form-control" placeholder="e.g. Paracetamol 650 mg" value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Generic Chemical Name</label>
              <input type="text" className="form-control" placeholder="e.g. Paracetamol" value={medForm.generic_name} onChange={(e) => setMedForm({ ...medForm, generic_name: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Brand/Trade Name</label>
              <input type="text" className="form-control" placeholder="e.g. Calpol / Crocin" value={medForm.brand_name} onChange={(e) => setMedForm({ ...medForm, brand_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Strength / Spec</label>
              <input type="text" className="form-control" placeholder="e.g. 650 mg / 10 ml" value={medForm.strength} onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Dosage Form *</label>
              <select className="form-control" value={medForm.dosage_form} onChange={(e) => setMedForm({ ...medForm, dosage_form: e.target.value })}>
                {DOSAGE_FORMS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Therapeutic Category</label>
              <select className="form-control" value={medForm.category} onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Specialties Checklist */}
          <div className="form-group">
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Allowed Specialties *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {SPECIALTIES.map(spec => (
                <label key={spec} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={medForm.specialties.includes(spec)}
                    onChange={(e) => handleSpecialtyCheckboxChange('add', spec, e.target.checked)} 
                  />
                  <span>{spec}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Administration & Details */}
          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Route of Administration</label>
              <input type="text" className="form-control" placeholder="e.g. Oral, Topical, IV" value={medForm.route} onChange={(e) => setMedForm({ ...medForm, route: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Manufacturer</label>
              <input type="text" className="form-control" placeholder="e.g. Cipla / GSK" value={medForm.manufacturer} onChange={(e) => setMedForm({ ...medForm, manufacturer: e.target.value })} />
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8, marginTop: 10 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>2. Stock &amp; Batch Management</h4>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Current Stock (Qty) *</label>
              <input type="number" className="form-control" placeholder="0" value={medForm.quantity} onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Batch Number</label>
              <input type="text" className="form-control" placeholder="e.g. B-9932" value={medForm.batch_number} onChange={(e) => setMedForm({ ...medForm, batch_number: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Mfg Date</label>
              <input type="date" className="form-control" value={medForm.mfg_date} onChange={(e) => setMedForm({ ...medForm, mfg_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Expiry Date *</label>
              <input type="date" className="form-control" value={medForm.expiry_date} onChange={(e) => setMedForm({ ...medForm, expiry_date: e.target.value })} required />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Min Stock Alarm Level</label>
              <input type="number" className="form-control" value={medForm.min_stock} onChange={(e) => setMedForm({ ...medForm, min_stock: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Reorder Auto Level</label>
              <input type="number" className="form-control" value={medForm.reorder_level} onChange={(e) => setMedForm({ ...medForm, reorder_level: e.target.value })} />
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8, marginTop: 10 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>3. Pricing &amp; Invoice Ledger</h4>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Purchase Price Per Unit (₹)</label>
              <input type="number" step="0.01" className="form-control" placeholder="0.00" value={medForm.purchase_price} onChange={(e) => setMedForm({ ...medForm, purchase_price: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Selling Price Per Unit (₹) *</label>
              <input type="number" step="0.01" className="form-control" placeholder="0.00" value={medForm.price} onChange={(e) => setMedForm({ ...medForm, price: e.target.value })} required />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>GST Rate (%)</label>
              <select className="form-control" value={medForm.gst_percent} onChange={(e) => setMedForm({ ...medForm, gst_percent: e.target.value })}>
                <option value="0">0% (Nil)</option>
                <option value="5">5% (Essential)</option>
                <option value="12">12% (Standard)</option>
                <option value="18">18% (Medicines)</option>
              </select>
            </div>
            <div className="form-group">
              <label>HSN Tariff Code</label>
              <input type="text" className="form-control" placeholder="e.g. 300490" value={medForm.hsn_code} onChange={(e) => setMedForm({ ...medForm, hsn_code: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Pack Size (Units)</label>
              <input type="number" className="form-control" placeholder="e.g. 10 per strip" value={medForm.pack_size} onChange={(e) => setMedForm({ ...medForm, pack_size: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Unit Label</label>
              <input type="text" className="form-control" placeholder="e.g. Tablet, Tube, Vial" value={medForm.unit} onChange={(e) => setMedForm({ ...medForm, unit: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Prescription Required?</label>
              <select className="form-control" value={medForm.prescription_required} onChange={(e) => setMedForm({ ...medForm, prescription_required: e.target.value })}>
                <option value="No">No (OTC)</option>
                <option value="Yes">Yes (Rx Only)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Storage Details</label>
              <input type="text" className="form-control" placeholder="e.g. Dry space below 30C" value={medForm.storage_condition} onChange={(e) => setMedForm({ ...medForm, storage_condition: e.target.value })} />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={formLoading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Replenish Inventory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── EDIT MEDICINE MODAL ─── */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => { setIsEditModalOpen(false); setFormError(''); setFormSuccess(''); setEditingMedicine(null); }}
        title={`Update Medicine Profile - ${editingMedicine?.medicine_name}`}
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {formError && <div className="alert alert-danger" style={{ marginBottom: 8 }}>{formError}</div>}
          {formSuccess && <div className="alert alert-success" style={{ marginBottom: 8 }}>{formSuccess}</div>}

          {/* Basic Information */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>1. Basic Identification</h4>
          </div>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Medicine Name *</label>
              <input type="text" className="form-control" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Generic Chemical Name</label>
              <input type="text" className="form-control" value={editForm.generic_name} onChange={(e) => setEditForm({ ...editForm, generic_name: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Brand/Trade Name</label>
              <input type="text" className="form-control" value={editForm.brand_name} onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Strength / Spec</label>
              <input type="text" className="form-control" value={editForm.strength} onChange={(e) => setEditForm({ ...editForm, strength: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Dosage Form *</label>
              <select className="form-control" value={editForm.dosage_form} onChange={(e) => setEditForm({ ...editForm, dosage_form: e.target.value })}>
                {DOSAGE_FORMS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Therapeutic Category</label>
              <select className="form-control" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Specialties Checklist */}
          <div className="form-group">
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Allowed Specialties *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {SPECIALTIES.map(spec => (
                <label key={spec} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={editForm.specialties.includes(spec)}
                    onChange={(e) => handleSpecialtyCheckboxChange('edit', spec, e.target.checked)} 
                  />
                  <span>{spec}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Administration & Details */}
          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Route of Administration</label>
              <input type="text" className="form-control" value={editForm.route} onChange={(e) => setEditForm({ ...editForm, route: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Manufacturer</label>
              <input type="text" className="form-control" value={editForm.manufacturer} onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })} />
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8, marginTop: 10 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>2. Stock &amp; Batch Management</h4>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Current Stock (Qty) *</label>
              <input type="number" className="form-control" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Batch Number</label>
              <input type="text" className="form-control" value={editForm.batch_number} onChange={(e) => setEditForm({ ...editForm, batch_number: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Mfg Date</label>
              <input type="date" className="form-control" value={editForm.mfg_date} onChange={(e) => setEditForm({ ...editForm, mfg_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Expiry Date *</label>
              <input type="date" className="form-control" value={editForm.expiry_date} onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })} required />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Min Stock Alarm Level</label>
              <input type="number" className="form-control" value={editForm.min_stock} onChange={(e) => setEditForm({ ...editForm, min_stock: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Reorder Auto Level</label>
              <input type="number" className="form-control" value={editForm.reorder_level} onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })} />
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8, marginTop: 10 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>3. Pricing &amp; Invoice Ledger</h4>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Purchase Price Per Unit (₹)</label>
              <input type="number" step="0.01" className="form-control" value={editForm.purchase_price} onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Selling Price Per Unit (₹) *</label>
              <input type="number" step="0.01" className="form-control" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>GST Rate (%)</label>
              <select className="form-control" value={editForm.gst_percent} onChange={(e) => setEditForm({ ...editForm, gst_percent: e.target.value })}>
                <option value="0">0% (Nil)</option>
                <option value="5">5% (Essential)</option>
                <option value="12">12% (Standard)</option>
                <option value="18">18% (Medicines)</option>
              </select>
            </div>
            <div className="form-group">
              <label>HSN Tariff Code</label>
              <input type="text" className="form-control" value={editForm.hsn_code} onChange={(e) => setEditForm({ ...editForm, hsn_code: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Pack Size (Units)</label>
              <input type="number" className="form-control" value={editForm.pack_size} onChange={(e) => setEditForm({ ...editForm, pack_size: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Unit Label</label>
              <input type="text" className="form-control" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Prescription Required?</label>
              <select className="form-control" value={editForm.prescription_required} onChange={(e) => setEditForm({ ...editForm, prescription_required: e.target.value })}>
                <option value="No">No (OTC)</option>
                <option value="Yes">Yes (Rx Only)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Storage Details</label>
              <input type="text" className="form-control" value={editForm.storage_condition} onChange={(e) => setEditForm({ ...editForm, storage_condition: e.target.value })} />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); setEditingMedicine(null); }} disabled={formLoading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
