import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingCart, 
  Trash2, 
  Printer, 
  Plus, 
  Search, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Pill,
  CreditCard
} from 'lucide-react';
import './Sales.css';

const Sales = () => {
  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 1. Inventory & Medicines list
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Billing Cart
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0); // in percentage
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  // 3. Checkout Status / Invoice State
  const [submitting, setSubmitting] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [notification, setNotification] = useState(null);

  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 4. Load Medicines from Store
  const loadMedicines = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:3001/api/inventory/medicines', authHeaders);
      setMedicines(res.data.medicines || []);
    } catch (err) {
      console.error(err);
      triggerNotification('danger', 'Failed to retrieve inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  // 5. Add Item to Cart
  const addToCart = (med) => {
    if (med.quantity <= 0) {
      triggerNotification('danger', `${med.medicine_name.toUpperCase()} is out of stock!`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.medicine_id === med.medicine_id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].qty;
      if (currentQty >= med.quantity) {
        triggerNotification('danger', `Cannot exceed available stock of ${med.quantity} units.`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].qty += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, {
        medicine_id: med.medicine_id,
        medicine_name: med.medicine_name,
        price: parseFloat(med.price),
        qty: 1,
        maxStock: med.quantity
      }]);
    }
    triggerNotification('success', `${med.medicine_name.toUpperCase()} added to cart.`);
  };

  // 6. Update Quantity in Cart
  const updateCartQty = (id, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty <= 0) return;

    const updatedCart = cart.map(item => {
      if (item.medicine_id === id) {
        if (qty > item.maxStock) {
          triggerNotification('danger', `Only ${item.maxStock} units available in stock.`);
          return { ...item, qty: item.maxStock };
        }
        return { ...item, qty };
      }
      return item;
    });
    setCart(updatedCart);
  };

  // 7. Remove from Cart
  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.medicine_id !== id));
  };

  // 8. Calculations
  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const getDiscountAmount = () => {
    return (getSubtotal() * discount) / 100;
  };

  const getGrandTotal = () => {
    return getSubtotal() - getDiscountAmount();
  };

  // 9. Process Checkout (Multi-update)
  const handleCheckout = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (cart.length === 0) {
      setErrorMessage('Billing cart is empty.');
      return;
    }

    setSubmitting(true);

    try {
      // Deduct stock for each item in the cart sequentially
      // Note: Backend endpoint is PUT /api/inventory/medicines/:id/stock with body { quantitySold }
      for (const item of cart) {
        await axios.put(
          `http://127.0.0.1:3001/api/inventory/medicines/${item.medicine_id}/stock`,
          { quantitySold: item.qty },
          authHeaders
        );
      }

      // Generate invoice details
      const invoiceNum = 'INV-' + Date.now().toString().slice(-8);
      const invoiceData = {
        invoiceNumber: invoiceNum,
        date: new Date().toLocaleString(),
        patient: {
          name: patientName.trim() || 'Walk-In Customer',
          phone: patientPhone.trim() || 'N/A'
        },
        items: [...cart],
        subtotal: getSubtotal(),
        discount: discount,
        discountVal: getDiscountAmount(),
        total: getGrandTotal()
      };

      setCompletedInvoice(invoiceData);
      triggerNotification('success', 'Transaction processed successfully!');
      
      // Clear cart and customer info
      setCart([]);
      setPatientName('');
      setPatientPhone('');
      setDiscount(0);
      
      // Reload medicine inventory
      loadMedicines();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || 'Failed to complete checkout transaction. Check stock limits.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter medicines
  const filteredMeds = medicines.filter(m => 
    m.medicine_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="sales-portal">
      
      {/* Toast Alert */}
      {notification && (
        <div className={`toast-notification ${notification.type} animate-fade-in`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* If Invoice completed, render printable invoice screen first */}
      {completedInvoice ? (
        <div className="invoice-receipt-container animate-fade-in">
          <div className="invoice-receipt glass-card" id="printable-area">
            <div className="receipt-header">
              <div className="clinic-brand">
                <FileText className="receipt-logo" size={28} />
                <h2>Suma Clinic</h2>
              </div>
              <div className="invoice-details-meta">
                <p><strong>Invoice:</strong> {completedInvoice.invoiceNumber}</p>
                <p><strong>Date:</strong> {completedInvoice.date}</p>
              </div>
            </div>

            <div className="receipt-customer-details">
              <h4>Customer/Patient Info</h4>
              <p><strong>Name:</strong> {completedInvoice.patient.name}</p>
              <p><strong>Phone:</strong> {completedInvoice.patient.phone}</p>
            </div>

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {completedInvoice.items.map(item => (
                  <tr key={item.medicine_id}>
                    <td>{item.medicine_name.toUpperCase()}</td>
                    <td style={{ textAlign: 'right' }}>${item.price.toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>${(item.price * item.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-totals">
              <div className="totals-row">
                <span>Subtotal:</span>
                <span>${completedInvoice.subtotal.toFixed(2)}</span>
              </div>
              {completedInvoice.discount > 0 && (
                <div className="totals-row discount-row text-warn">
                  <span>Discount ({completedInvoice.discount}%):</span>
                  <span>-${completedInvoice.discountVal.toFixed(2)}</span>
                </div>
              )}
              <div className="totals-row grand-total">
                <span>Grand Total:</span>
                <span>${completedInvoice.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="receipt-footer">
              <p>Thank you for choosing Suma Clinic Pharmacy.</p>
              <p className="no-print">Call 1-800-CLINIC for support.</p>
            </div>
          </div>

          <div className="receipt-actions no-print">
            <button onClick={() => window.print()} className="action-btn print-btn">
              <Printer size={18} />
              <span>Print Invoice</span>
            </button>
            <button onClick={() => setCompletedInvoice(null)} className="action-btn new-sale-btn">
              <Plus size={18} />
              <span>New Sales Transaction</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular checkout panels */
        <div className="billing-split animate-fade-in">
          
          {/* Left panel: Medicine Selector */}
          <div className="selector-panel glass-card">
            <div className="panel-header">
              <h3>Search & Select Medicine</h3>
              <span className="badge-count blue">{medicines.length} in catalog</span>
            </div>

            {/* Medicine search bar */}
            <div className="search-box-billing">
              <input 
                type="text" 
                placeholder="Search stock catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={18} className="search-icon" />
            </div>

            {loading ? (
              <div className="dir-loading"><span className="spinner"></span></div>
            ) : filteredMeds.length === 0 ? (
              <p className="no-meds-msg">No medicines found in store catalog.</p>
            ) : (
              <div className="medicines-grid">
                {filteredMeds.map(med => {
                  const outOfStock = med.quantity <= 0;
                  const lowStock = med.quantity > 0 && med.quantity < 10;
                  
                  return (
                    <div 
                      key={med.medicine_id} 
                      className={`med-card ${outOfStock ? 'disabled' : ''}`}
                      onClick={() => !outOfStock && addToCart(med)}
                    >
                      <div className="med-info">
                        <span className="med-title">{med.medicine_name.toUpperCase()}</span>
                        <div className="med-details-row">
                          <span className="med-price">${parseFloat(med.price).toFixed(2)}</span>
                          <span className={`med-qty ${outOfStock ? 'red' : lowStock ? 'warn' : 'green'}`}>
                            {outOfStock ? 'Out of stock' : `${med.quantity} left`}
                          </span>
                        </div>
                      </div>
                      <button className="add-to-cart-btn" disabled={outOfStock}>
                        <Plus size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Cart Checkout */}
          <div className="cart-panel glass-card">
            <div className="panel-header">
              <h3>Direct Walk-In Checkout</h3>
              <div className="cart-header-count">
                <ShoppingCart size={18} />
                <span>{cart.length} items</span>
              </div>
            </div>

            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <form onSubmit={handleCheckout} className="checkout-form">
              {/* Customer Inputs */}
              <div className="customer-details-section">
                <h4>Customer Details</h4>
                <div className="form-row">
                  <div className="input-group">
                    <label>Patient Name (Optional)</label>
                    <div className="input-with-icon">
                      <User size={16} />
                      <input 
                        type="text" 
                        placeholder="e.g. John Doe"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Phone Number (Optional)</label>
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input 
                        type="text" 
                        placeholder="e.g. +1 555-0199"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cart List */}
              <div className="cart-items-section">
                <h4>Items List</h4>
                {cart.length === 0 ? (
                  <div className="empty-cart-state">
                    <ShoppingCart size={32} />
                    <p>Checkout cart is currently empty. Click on medicines on the left to add items.</p>
                  </div>
                ) : (
                  <div className="cart-items-list">
                    {cart.map(item => (
                      <div key={item.medicine_id} className="cart-item-row">
                        <div className="item-name-info">
                          <Pill size={16} className="med-icon" />
                          <span>{item.medicine_name.toUpperCase()}</span>
                        </div>

                        <div className="item-qty-price">
                          <input 
                            type="number" 
                            min="1"
                            max={item.maxStock}
                            value={item.qty}
                            onChange={(e) => updateCartQty(item.medicine_id, e.target.value)}
                            className="item-qty-input"
                          />
                          <span className="unit-price">@ ${item.price.toFixed(2)}</span>
                          <span className="item-subtotal">${(item.price * item.qty).toFixed(2)}</span>
                          <button 
                            type="button" 
                            onClick={() => removeFromCart(item.medicine_id)} 
                            className="item-remove-btn"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount selection */}
              <div className="discount-section">
                <label>Apply Discount (%)</label>
                <select 
                  value={discount} 
                  onChange={(e) => setDiscount(parseInt(e.target.value))}
                  className="discount-dropdown"
                >
                  <option value="0">No Discount (0%)</option>
                  <option value="5">5% Discount</option>
                  <option value="10">10% Discount</option>
                  <option value="15">15% Discount</option>
                  <option value="20">20% Discount</option>
                </select>
              </div>

              {/* Checkout Totals */}
              <div className="checkout-summary-section">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${getSubtotal().toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="summary-row text-warn">
                    <span>Discount Discount:</span>
                    <span>-${getDiscountAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row grand-total-row">
                  <span>Total Amount Due:</span>
                  <span>${getGrandTotal().toFixed(2)}</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="checkout-submit-btn" 
                disabled={submitting || cart.length === 0}
              >
                <CreditCard size={18} />
                <span>{submitting ? 'Processing Transaction...' : 'Confirm Payment & Print'}</span>
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};

export default Sales;
