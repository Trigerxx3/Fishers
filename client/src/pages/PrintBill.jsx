import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { formatDate } from '../utils';

export default function PrintBill() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/bills/${id}`).then(res => {
      setData(res.data);
      setTimeout(() => window.print(), 800);
    });
  }, [id]);

  if (!data) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
      Loading bill...
    </div>
  );

  const { bill, items, settings } = data;
  const totalBoxes = items.reduce((sum, i) => sum + parseFloat(i.box || 0), 0);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; background: white; font-size: 13px; color: #000; }
        @media print {
          body { width: 148mm; }
          @page { size: A5; margin: 8mm 10mm; }
        }
        @media screen {
          body { max-width: 540px; margin: 0 auto; padding: 24px; }
        }
        .print-page { background: white; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
        .business-name { font-size: 22px; font-weight: 900; letter-spacing: 4px; font-family: 'Arial Black', Arial, sans-serif; }
        .business-addr { font-size: 12px; }
        .bill-info { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
        .party-line { font-size: 13px; font-weight: bold; margin-bottom: 6px; border-bottom: 1px dashed #000; padding-bottom: 4px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .items-table th { border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 4px 3px; font-size: 11px; text-align: left; }
        .items-table td { padding: 3px; font-size: 12px; }
        .items-table th:last-child, .items-table td:last-child { text-align: right; }
        .items-table th:nth-child(2), .items-table td:nth-child(2),
        .items-table th:nth-child(3), .items-table td:nth-child(3),
        .items-table th:nth-child(4), .items-table td:nth-child(4) { text-align: right; }
        .summary { border-top: 1px dashed #000; padding-top: 5px; }
        .summary-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12.5px; }
        .summary-row.total { font-weight: bold; border-top: 1px solid #000; margin-top: 3px; padding-top: 3px; }
        .summary-row.grand { font-size: 14px; font-weight: 900; border-top: 2px solid #000; border-bottom: 2px solid #000; margin: 3px 0; padding: 3px 0; }
        .footer { text-align: center; margin-top: 16px; border-top: 1px dashed #000; padding-top: 8px; font-size: 13px; letter-spacing: 2px; font-weight: bold; }
        .no-print { }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div style={{ textAlign: 'center', padding: '12px', marginBottom: 16, background: '#f8fafc', borderRadius: 8, display: 'flex', justifyContent: 'center', gap: 8 }} className="no-print">
        <button onClick={() => window.print()} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)' }}>
          🖨️ Print Slip
        </button>
        <button onClick={() => window.close()} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, color: '#334155' }}>
          ✕ Close
        </button>
      </div>

      <div className="print-page">
        {/* Header */}
        <div className="header">
          <div className="business-name">{settings?.business_name || 'JSK fishers'}</div>
          <div className="business-addr">{settings?.address || 'kanhangad fish market'}, {settings?.city || 'Kasaragod'}</div>
          {settings?.phone && <div className="business-addr">Ph: {settings.phone}</div>}
          {settings?.gst_number && <div className="business-addr">GSTIN: {settings.gst_number}</div>}
        </div>

        {/* Bill info */}
        <div className="bill-info">
          <span><strong>Bill No:</strong> {bill.bill_number}</span>
          <span><strong>Date:</strong> {formatDate(bill.bill_date)}</span>
        </div>

        {/* Party */}
        <div className="party-line">
          To: {bill.party_name}
          {totalBoxes > 0 && <span style={{ float: 'right' }}>Total Boxes: {totalBoxes}</span>}
        </div>

        {/* Items table */}
        <table className="items-table">
          <thead>
            <tr>
              <th>Particulars</th>
              <th>Box</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.item_name}</td>
                <td style={{ textAlign: 'right' }}>{item.box}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity || 0}</td>
                <td style={{ textAlign: 'right' }}>{parseFloat(item.rate).toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}>{parseFloat(item.total).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="summary">
          <div className="summary-row total">
            <span>Total</span>
            <span>{parseFloat(bill.gross_total).toLocaleString('en-IN')}</span>
          </div>
          {parseFloat(bill.commission) > 0 && (
            <div className="summary-row">
              <span>Commission</span>
              <span>{parseFloat(bill.commission).toLocaleString('en-IN')}</span>
            </div>
          )}
          {parseFloat(bill.vehicle_rent) > 0 && (
            <div className="summary-row">
              <span>Vehicle Rent</span>
              <span>{parseFloat(bill.vehicle_rent).toLocaleString('en-IN')}</span>
            </div>
          )}
          {parseFloat(bill.unloading) > 0 && (
            <div className="summary-row">
              <span>Unloading</span>
              <span>{parseFloat(bill.unloading).toLocaleString('en-IN')}</span>
            </div>
          )}
          {parseFloat(bill.total_expenses) > 0 && (
            <div className="summary-row total">
              <span>Total Expense</span>
              <span>{parseFloat(bill.total_expenses).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>Net Amount</span>
            <span>{parseFloat(bill.net_amount).toLocaleString('en-IN')}</span>
          </div>
          {parseFloat(bill.old_balance) > 0 && (
            <div className="summary-row">
              <span>Old Balance</span>
              <span>{parseFloat(bill.old_balance).toLocaleString('en-IN')}</span>
            </div>
          )}
          {parseFloat(bill.old_balance) > 0 && (
            <div className="summary-row total">
              <span>Total Due</span>
              <span>{parseFloat(bill.total_due).toLocaleString('en-IN')}</span>
            </div>
          )}
          {parseFloat(bill.paid_amount) > 0 && (
            <div className="summary-row">
              <span>Paid ({bill.payment_method})</span>
              <span>{parseFloat(bill.paid_amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="summary-row grand">
            <span>Balance</span>
            <span>{parseFloat(bill.balance).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          {settings?.footer_text || 'HAVE A NICE DAY!'}
        </div>
      </div>
    </>
  );
}
