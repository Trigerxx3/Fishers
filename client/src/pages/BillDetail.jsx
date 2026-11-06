import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { formatCurrency, formatDate, getStatusClass, getStatusLabel } from '../utils';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit2, Printer, FileText } from 'lucide-react';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/bills/${id}`).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Bill not found');
      navigate('/bills');
    });
  }, [id, navigate]);

  if (loading) return (
    <div className="page-container">
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading bill details...</span>
      </div>
    </div>
  );
  if (!data) return null;

  const { bill, items } = data;
  const balanceNum = parseFloat(bill.balance || 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">
            <span>Bill #{bill.bill_number}</span>
            <span className={`badge-pill-status ${getStatusClass(bill.status)}`} style={{ marginLeft: 12, verticalAlign: 'middle' }}>
              <span className="status-dot" />
              {getStatusLabel(bill.status)}
            </span>
          </div>
          <div className="page-subtitle">{formatDate(bill.bill_date)} · {bill.party_name}</div>
        </div>
        <div className="flex gap-8 no-print">
          <button className="btn btn-secondary btn-icon-text" onClick={() => navigate('/bills')}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          {bill.status !== 'VOID' && (
            <button className="btn btn-secondary btn-icon-text" onClick={() => navigate(`/bills/${id}/edit`)}>
              <Edit2 size={14} />
              <span>Edit</span>
            </button>
          )}
          <button className="btn btn-secondary btn-icon-text" onClick={() => window.open(`/bills/${id}/print`, '_blank')}>
            <Printer size={14} />
            <span>Print Memo</span>
          </button>
          <button className="btn btn-primary btn-icon-text" onClick={() => window.open(`/bills/${id}/invoice`, '_blank')}>
            <FileText size={14} />
            <span>View Invoice</span>
          </button>
        </div>
      </div>

      {bill.status === 'VOID' && (
        <div className="alert alert-error">
          <strong>This bill has been voided.</strong> Reason: {bill.void_reason}
        </div>
      )}

      <div className="bill-detail-layout">
        {/* Left: Bill details */}
        <div>
          {/* Party & Date info */}
          <div className="card card-elevated" style={{ marginBottom: 14 }}>
            <div className="grid-2">
              <div>
                <div className="section-title">Bill To (Party)</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text)' }}>{bill.party_name}</div>
                {bill.party_phone && <div className="text-secondary" style={{ marginTop: 2 }}>{bill.party_phone}</div>}
                {bill.party_address && <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{bill.party_address}</div>}
              </div>
              <div>
                <div className="section-title">Transaction Details</div>
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Bill No:</strong> <span className="font-mono">#{bill.bill_number}</span></div>
                  <div><strong>Invoice No:</strong> <span className="font-mono">{bill.invoice_number || '—'}</span></div>
                  <div><strong>Date:</strong> {formatDate(bill.bill_date)}</div>
                  <div><strong>Payment Method:</strong> {bill.payment_method}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card card-elevated" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--color-border)' }}>
              <div className="card-title">Bill Items & Quantities</div>
            </div>
            <div className="table-container table-flush">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Particulars</th>
                    <th className="right">Box</th>
                    <th className="right">Qty</th>
                    <th className="right">Rate (₹)</th>
                    <th className="right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="table-row-hover">
                      <td><span className="party-name-bold">{item.item_name}</span></td>
                      <td className="right amount-cell">{item.box}</td>
                      <td className="right amount-cell">{item.quantity}</td>
                      <td className="right amount-cell font-mono">{formatCurrency(item.rate)}</td>
                      <td className="right amount-cell font-mono font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface-hover)' }}>
                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700, borderTop: '2px solid var(--color-border)', padding: '12px 16px' }}>
                      GROSS TOTAL
                    </td>
                    <td className="right font-mono" style={{ fontWeight: 800, borderTop: '2px solid var(--color-border)', fontSize: 15, padding: '12px 16px' }}>
                      {formatCurrency(bill.gross_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Financial summary */}
        <div>
          <div className="card card-elevated">
            <div className="card-title" style={{ marginBottom: 14 }}>Financial Breakdown</div>
            <div className="financial-summary">
              <div className="financial-row total-row">
                <span>Gross Total</span>
                <span className="financial-value">{formatCurrency(bill.gross_total)}</span>
              </div>
              <div className="financial-row deduction" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Commission</span>
                <span className="font-mono">({formatCurrency(bill.commission)})</span>
              </div>
              <div className="financial-row deduction" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Vehicle Rent</span>
                <span className="font-mono">({formatCurrency(bill.vehicle_rent)})</span>
              </div>
              <div className="financial-row deduction" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Unloading</span>
                <span className="font-mono">({formatCurrency(bill.unloading)})</span>
              </div>
              <div className="financial-row deduction">
                <span>Total Expenses</span>
                <span className="font-mono">({formatCurrency(bill.total_expenses)})</span>
              </div>
              <div className="financial-row total-row" style={{ background: 'var(--color-primary-light)' }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Net Amount</span>
                <span className="font-mono" style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{formatCurrency(bill.net_amount)}</span>
              </div>
              <div className="financial-row" style={{ background: 'var(--color-warning-bg)' }}>
                <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Old Balance</span>
                <span className="font-mono" style={{ color: 'var(--color-warning)', fontWeight: 600 }}>+ {formatCurrency(bill.old_balance)}</span>
              </div>
              <div className="financial-row total-row">
                <span>Total Due</span>
                <span className="financial-value">{formatCurrency(bill.total_due)}</span>
              </div>
              <div className="financial-row" style={{ background: 'var(--color-success-bg)' }}>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Paid ({bill.payment_method})</span>
                <span className="font-mono" style={{ color: 'var(--color-success)', fontWeight: 700 }}>({formatCurrency(bill.paid_amount)})</span>
              </div>
              <div className="financial-row grand-total">
                <span>OUTSTANDING BALANCE</span>
                <span className="financial-value" style={{ color: balanceNum > 0 ? '#fff' : '#34d399' }}>
                  {formatCurrency(bill.balance)}
                </span>
              </div>
            </div>

            {bill.notes && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                <strong>Notes:</strong> {bill.notes}
              </div>
            )}

            <div style={{ marginTop: 16, fontSize: 11.5, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-light)', paddingTop: 12 }}>
              <div>Recorded by: <strong>{bill.created_by_name}</strong></div>
              <div>Created: {new Date(bill.created_at).toLocaleString('en-IN')}</div>
              {bill.updated_at !== bill.created_at && (
                <div>Updated: {new Date(bill.updated_at).toLocaleString('en-IN')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
