import React from 'react';
import { Printer, X } from 'lucide-react';

const BillPopup = ({ isOpen, onClose, billData }) => {
  if (!isOpen || !billData) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-invoice-area').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Hospital Bill - ${billData.receipt_number || billData.bill_number}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 20px;
              color: #000;
              background: #fff;
            }
            .invoice-card {
              max-width: 600px;
              margin: 0 auto;
              border: 1px dashed #333;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .header h2 {
              margin: 0 0 5px 0;
              font-size: 22px;
              text-transform: uppercase;
            }
            .header p {
              margin: 3px 0;
              font-size: 13px;
            }
            .details {
              margin-bottom: 20px;
              font-size: 13px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
            }
            .item-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 13px;
            }
            .item-table th, .item-table td {
              border-bottom: 1px dashed #333;
              padding: 8px;
              text-align: left;
            }
            .item-table th:last-child, .item-table td:last-child {
              text-align: right;
            }
            .summary {
              text-align: right;
              font-size: 15px;
              font-weight: bold;
              margin-bottom: 30px;
              border-top: 1px solid #333;
              padding-top: 10px;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              margin-top: 40px;
              border-top: 1px dashed #333;
              padding-top: 10px;
            }
            .signature-block {
              display: flex;
              justify-content: space-between;
              margin-top: 45px;
              font-size: 13px;
            }
            .sig-line {
              border-top: 1px solid #000;
              width: 150px;
              text-align: center;
              margin-top: 40px;
              padding-top: 5px;
            }
            @media print {
              body { padding: 0; }
              .invoice-card { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const {
    receipt_type = 'OPD Consultation Receipt',
    receipt_number = `OPD-${Date.now()}`,
    bill_number,
    patient_name,
    patient_id,
    doctor_name,
    visit_id,
    payment_method = 'Cash / Desk Payment',
    consultation_fee = 0,
    total_amount = 0,
    items = [],
    created_at = new Date()
  } = billData;

  const displayNum = bill_number || receipt_number;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1a1a24',
        border: '1px solid #2e2e3e',
        borderRadius: '12px',
        color: '#e2e8f0',
        width: '100%',
        maxWidth: '650px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Controls Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #2e2e3e'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Invoice Preview</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handlePrint} style={{
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500'
            }}>
              <Printer size={16} /> Print / Save PDF
            </button>
            <button onClick={onClose} style={{
              backgroundColor: 'transparent',
              border: '1px solid #2e2e3e',
              color: '#94a3b8',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Area Wrapper */}
        <div style={{ padding: '24px', backgroundColor: '#fff', color: '#000', margin: '20px', borderRadius: '8px' }}>
          <div id="printable-invoice-area" style={{ fontFamily: 'Courier New, Courier, monospace' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', textTransform: 'uppercase', fontWeight: 'bold' }}>SUMA HOSPITAL & OPD CLINIC</h2>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>GSTIN: 27SUMA1234A1Z0 | Reg No: CLINIC/2026/099</p>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>Address: Plot No 12, Senapati Bapat Road, Pune - 411016</p>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>Tel: +91 20 2567 8900 | E-mail: billing@sumahospital.in</p>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', margin: '10px 0', fontWeight: 'bold', textDecoration: 'underline', fontSize: '14px', textTransform: 'uppercase' }}>
              {receipt_type}
            </div>

            {/* Visit Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', marginBottom: '15px' }}>
              <div><strong>Patient ID:</strong> P-{patient_id}</div>
              <div><strong>Invoice Date:</strong> {new Date(created_at).toLocaleString()}</div>
              <div><strong>Patient Name:</strong> {patient_name}</div>
              <div><strong>Invoice No:</strong> {displayNum}</div>
              <div><strong>Doctor In-Charge:</strong> {doctor_name || 'General OPD Doctor'}</div>
              <div><strong>Payment Mode:</strong> {payment_method}</div>
            </div>

            {/* Item Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Sr.</th>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '6px 4px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>Rate (₹)</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {parseFloat(consultation_fee) > 0 && (
                  <tr style={{ borderBottom: '1px dashed #ddd' }}>
                    <td style={{ padding: '6px 4px' }}>1</td>
                    <td style={{ padding: '6px 4px' }}>OPD Doctor Consultation Fee</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{parseFloat(consultation_fee).toFixed(2)}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{parseFloat(consultation_fee).toFixed(2)}</td>
                  </tr>
                )}
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dashed #ddd' }}>
                      <td style={{ padding: '6px 4px' }}>{parseFloat(consultation_fee) > 0 ? idx + 2 : idx + 1}</td>
                      <td style={{ padding: '6px 4px' }}>{item.medicine_name}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>{item.quantity || 1}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{parseFloat(item.price || item.price_per_unit || 0).toFixed(2)}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{parseFloat(item.total || (item.quantity || 1) * (item.price || item.price_per_unit || 0)).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (!consultation_fee || parseFloat(consultation_fee) === 0) ? (
                  <tr>
                    <td style={{ padding: '6px 4px' }}>1</td>
                    <td style={{ padding: '6px 4px' }}>OPD Consultation & Visit Registration Fee</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{total_amount.toFixed(2)}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{total_amount.toFixed(2)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 'bold', padding: '6px 4px', borderTop: '1px solid #000' }}>
              GRAND TOTAL: ₹{total_amount.toFixed(2)}
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '12px' }}>
              <div>
                <div style={{ borderTop: '1px solid #000', width: '140px', marginTop: '25px', textAlign: 'center', paddingTop: '4px' }}>
                  Patient/Relative
                </div>
              </div>
              <div>
                <div style={{ borderTop: '1px solid #000', width: '140px', marginTop: '25px', textAlign: 'center', paddingTop: '4px' }}>
                  Authorized Signatory
                </div>
              </div>
            </div>

            {/* Thank You Note */}
            <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '20px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
              Get Well Soon. Thank you for choosing Suma Hospital.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPopup;
