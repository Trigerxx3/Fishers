import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { formatDate, formatCurrency } from '../utils';

export default function Invoice() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/bills/${id}`).then(res => {
      setData(res.data);
      setTimeout(() => window.print(), 800);
    });
  }, [id]);

  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Loading invoice...</div>;

  const { bill, items, settings } = data;

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif; background: #0f172a; font-size: 13px; color: #1e293b; }
        @media print {
          body { background: white !important; }
          @page { size: A4; margin: 12mm 14mm; }
          .no-print { display: none !important; }
          .invoice { box-shadow: none !important; padding: 0 !important; }
        }
        @media screen {
          body { padding: 32px 16px; background: #0f172a; }
          .invoice-wrapper { max-width: 760px; margin: 0 auto; }
        }
        .invoice { background: white; padding: 42px 48px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.35); position: relative; }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #0284c7; padding-bottom: 22px; }
        .inv-logo-badge { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .inv-fish-icon { font-size: 26px; }
        .inv-logo { font-size: 26px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
        .inv-addr { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.6; }
        .inv-meta { text-align: right; }
        .inv-title { font-size: 26px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; }
        .inv-num { font-size: 12.5px; color: #475569; margin-top: 6px; line-height: 1.6; }
        .parties-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .party-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
        .party-box h4 { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0284c7; margin-bottom: 6px; }
        .party-box .name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .party-box p { font-size: 12px; color: #64748b; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead th { background: #0284c7; color: white; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
        thead th:first-child { border-top-left-radius: 6px; }
        thead th:last-child { text-align: right; border-top-right-radius: 6px; }
        thead th:nth-child(2), thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
        tbody td { padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 12.5px; }
        tbody td:nth-child(2), tbody td:nth-child(3), tbody td:nth-child(4), tbody td:nth-child(5) { text-align: right; font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        .totals { display: flex; justify-content: flex-end; }
        .totals-box { width: 300px; }
        .total-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 12.5px; border-bottom: 1px solid #edf2f7; }
        .total-row.highlight { font-weight: 800; font-size: 15px; background: linear-gradient(135deg, #0284c7, #0369a1); color: white; padding: 10px 14px; margin: 10px 0; border-radius: 6px; border-bottom: none; }
        .total-row.section { background: #f8fafc; padding: 7px 10px; font-weight: 600; margin: 4px 0; border-bottom: none; border-radius: 4px; }
        .footer-inv { margin-top: 36px; border-top: 2px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
        .sig-line { width: 160px; border-top: 1px solid #475569; margin-top: 40px; text-align: center; font-size: 11px; padding-top: 5px; color: #475569; }
      `}</style>

      <div className="no-print" style={{ textAlign: 'center', padding: '14px', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'center', gap: 10 }}>
        <button onClick={() => window.print()} style={{ padding: '8px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)' }}>
          🖨️ Print Invoice
        </button>
        <button onClick={() => window.close()} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6 }}>
          ✕ Close
        </button>
      </div>

      <div className="invoice-wrapper">
        <div className="invoice">
          {/* Header */}
          <div className="inv-header">
            <div>
              <div className="inv-logo-badge">
                <span className="inv-fish-icon">🐟</span>
                <div className="inv-logo">{settings?.business_name || 'JSK Fishers'}</div>
              </div>
              <div className="inv-addr">
                {settings?.address || 'kanhangad fish market'}<br/>
                {settings?.city || 'Kasaragod'}, {settings?.state || 'Kerala'}<br/>
                {settings?.phone && <>Ph: {settings.phone}<br/></>}
                {settings?.email && <>Email: {settings.email}<br/></>}
                {settings?.gst_number && <>GSTIN: {settings.gst_number}</>}
              </div>
            </div>
            <div className="inv-meta">
              <div className="inv-title">Invoice</div>
              <div className="inv-num">
                <div><strong>Invoice No:</strong> {bill.invoice_number}</div>
                <div><strong>Bill No:</strong> {bill.bill_number}</div>
                <div><strong>Date:</strong> {formatDate(bill.bill_date)}</div>
              </div>
            </div>
          </div>

          {/* Bill To / From */}
          <div className="parties-row">
            <div className="party-box">
              <h4>Bill To</h4>
              <div className="name">{bill.party_name}</div>
              {bill.party_phone && <p>{bill.party_phone}</p>}
              {bill.party_address && <p>{bill.party_address}</p>}
              {bill.party_gst && <p>GSTIN: {bill.party_gst}</p>}
            </div>
            <div className="party-box">
              <h4>Payment Details</h4>
              <p><strong>Method:</strong> {bill.payment_method}</p>
              <p><strong>Status:</strong> {bill.status}</p>
            </div>
          </div>

          {/* Items */}
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Box</th>
                <th>Qty</th>
                <th>Rate (₹)</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.item_name}</td>
                  <td style={{ textAlign: 'right' }}>{item.box}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity || 0}</td>
                  <td style={{ textAlign: 'right' }}>{parseFloat(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right' }}>{parseFloat(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals">
            <div className="totals-box">
              <div className="total-row section">
                <span>Gross Amount</span>
                <span>{formatCurrency(bill.gross_total)}</span>
              </div>
              {parseFloat(bill.commission) > 0 && (
                <div className="total-row"><span>Commission</span><span>({formatCurrency(bill.commission)})</span></div>
              )}
              {parseFloat(bill.vehicle_rent) > 0 && (
                <div className="total-row"><span>Vehicle Rent</span><span>({formatCurrency(bill.vehicle_rent)})</span></div>
              )}
              {parseFloat(bill.unloading) > 0 && (
                <div className="total-row"><span>Unloading</span><span>({formatCurrency(bill.unloading)})</span></div>
              )}
              {parseFloat(bill.total_expenses) > 0 && (
                <div className="total-row section"><span>Total Expenses</span><span>({formatCurrency(bill.total_expenses)})</span></div>
              )}
              <div className="total-row section"><span>Net Amount</span><span>{formatCurrency(bill.net_amount)}</span></div>
              {parseFloat(bill.old_balance) > 0 && (
                <div className="total-row"><span>Previous Balance</span><span>{formatCurrency(bill.old_balance)}</span></div>
              )}
              {parseFloat(bill.old_balance) > 0 && (
                <div className="total-row section"><span>Total Due</span><span>{formatCurrency(bill.total_due)}</span></div>
              )}
              {parseFloat(bill.paid_amount) > 0 && (
                <div className="total-row" style={{ color: '#0a7c42' }}>
                  <span>Paid ({bill.payment_method})</span>
                  <span>({formatCurrency(bill.paid_amount)})</span>
                </div>
              )}
              <div className="total-row highlight"><span>Balance Due</span><span>{formatCurrency(bill.balance)}</span></div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer-inv">
            <div>
              <p><strong>Note:</strong> {bill.notes || 'Thank you for your business!'}</p>
              <p style={{ marginTop: 4 }}>{settings?.footer_text || 'HAVE A NICE DAY!'}</p>
            </div>
            <div>
              <div className="sig-line">Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
