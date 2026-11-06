import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { formatCurrency, formatDate, getStatusClass, getStatusLabel } from '../utils';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  BookOpen,
  PlusCircle,
  SlidersHorizontal,
  Eye,
  Printer,
  FileText
} from 'lucide-react';

export default function PartyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bills');
  const [adjModal, setAdjModal] = useState(false);
  const [adjForm, setAdjForm] = useState({ amount: '', type: 'CREDIT', reason: '' });

  const load = () => {
    setLoading(true);
    api.get(`/parties/${id}`).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Party not found');
      navigate('/parties');
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/parties/${id}/adjust`, adjForm);
      toast.success('Balance adjusted successfully');
      setAdjModal(false);
      setAdjForm({ amount: '', type: 'CREDIT', reason: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to adjust balance');
    }
  };

  if (loading) return (
    <div className="page-container">
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading party profile...</span>
      </div>
    </div>
  );
  if (!data) return null;

  const { party, bills, stats } = data;
  const currentBal = parseFloat(party.current_balance || 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">{party.party_name}</div>
          <div className="page-subtitle">
            {party.phone ? `${party.phone} · ` : ''}{party.party_code ? `Code: ${party.party_code} · ` : ''}
            <span style={{ color: currentBal > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
              Balance: {formatCurrency(party.current_balance)}
            </span>
          </div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary btn-icon-text" onClick={() => navigate('/parties')}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <button className="btn btn-secondary btn-icon-text" onClick={() => navigate(`/parties/${id}/ledger`)}>
            <BookOpen size={14} />
            <span>Ledger</span>
          </button>
          <button className="btn btn-secondary btn-icon-text" onClick={() => setAdjModal(true)}>
            <SlidersHorizontal size={14} />
            <span>Adjust</span>
          </button>
          <button className="btn btn-primary btn-icon-text" onClick={() => navigate(`/bills/new?party=${id}`)}>
            <PlusCircle size={14} />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="party-stats-grid">
        <div className="stat-card stat-theme-blue">
          <div className="stat-label">Total Bills</div>
          <div className="stat-value primary">{stats.total_bills}</div>
        </div>
        <div className="stat-card stat-theme-emerald">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value currency font-mono">{formatCurrency(stats.total_billed)}</div>
        </div>
        <div className="stat-card stat-theme-teal">
          <div className="stat-label">Total Paid</div>
          <div className="stat-value success currency font-mono">{formatCurrency(stats.total_paid)}</div>
        </div>
        <div className="stat-card stat-theme-rose">
          <div className="stat-label">Current Balance</div>
          <div className={`stat-value currency font-mono ${currentBal > 0 ? 'text-danger' : 'text-success'}`}>
            {formatCurrency(party.current_balance)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--color-border)', marginBottom: 16 }}>
        {['bills', 'info'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -2,
              fontFamily: 'inherit'
            }}
          >
            {t === 'bills' ? 'Bills History' : 'Party Profile'}
          </button>
        ))}
      </div>

      {tab === 'bills' && (
        <div className="card card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
          {bills.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <FileText size={36} strokeWidth={1.5} />
              </div>
              <h3>No Bills Recorded for this Party</h3>
              <p>Create a fish sale bill to start building transaction history.</p>
              <button className="btn btn-primary" onClick={() => navigate(`/bills/new?party=${id}`)}>
                <PlusCircle size={15} />
                <span>Create New Bill</span>
              </button>
            </div>
          ) : (
            <div className="table-container table-flush">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Date</th>
                    <th className="right">Gross Total</th>
                    <th className="right">Net Amount</th>
                    <th className="right">Paid</th>
                    <th className="right">Balance</th>
                    <th className="center">Status</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(b => {
                    const balanceNum = parseFloat(b.balance || 0);
                    return (
                      <tr key={b.id} className="table-row-hover">
                        <td>
                          <span className="bill-tag font-mono">#{b.bill_number}</span>
                        </td>
                        <td className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
                          {formatDate(b.bill_date)}
                        </td>
                        <td className="right amount-cell font-semibold">{formatCurrency(b.gross_total)}</td>
                        <td className="right amount-cell">{formatCurrency(b.net_amount)}</td>
                        <td className="right amount-cell text-success font-medium">{formatCurrency(b.paid_amount)}</td>
                        <td className={`right amount-cell font-semibold ${balanceNum > 0 ? 'text-danger' : 'text-success'}`}>
                          {formatCurrency(b.balance)}
                        </td>
                        <td className="center">
                          <span className={`badge-pill-status ${getStatusClass(b.status)}`}>
                            <span className="status-dot" />
                            {getStatusLabel(b.status)}
                          </span>
                        </td>
                        <td className="right">
                          <div className="actions-cell-modern">
                            <button
                              className="btn-action-icon"
                              onClick={() => navigate(`/bills/${b.id}`)}
                              title="View Bill Details"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              className="btn-action-icon btn-action-accent"
                              onClick={() => window.open(`/bills/${b.id}/print`, '_blank')}
                              title="Print Memo"
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'info' && (
        <div className="card card-elevated">
          <div className="grid-2">
            <div>
              <div className="form-group">
                <label className="form-label">Party Name</label>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{party.party_name}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="text-secondary">{party.phone || '—'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <div className="text-secondary">{party.address || '—'}</div>
              </div>
            </div>
            <div>
              <div className="form-group">
                <label className="form-label">Party Code</label>
                <div className="font-mono text-secondary">{party.party_code || '—'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <div className="text-secondary">{party.gst_number || '—'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Opening Balance</label>
                <div className="font-mono text-secondary">{formatCurrency(party.opening_balance)}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Account Status</label>
                <div>
                  <span className={`badge-pill-status ${party.is_active ? 'badge-paid' : 'badge-void'}`}>
                    <span className="status-dot" />
                    {party.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {party.notes && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Notes</label>
              <div className="text-secondary">{party.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* Manual Balance Adjustment Modal */}
      {adjModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAdjModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Manual Balance Adjustment</span>
              <button className="btn-close" onClick={() => setAdjModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdjustment}>
              <div className="modal-body">
                <div className="alert alert-warning">
                  Adjusting balance will directly affect the party's current ledger balance. All adjustments are logged with your user ID.
                </div>
                <div className="form-group">
                  <label className="form-label required">Adjustment Type</label>
                  <select
                    className="form-control"
                    value={adjForm.type}
                    onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="CREDIT">Credit (Payment / Discount - Reduces balance)</option>
                    <option value="DEBIT">Debit (Charge / Fine - Increases balance)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Amount (₹)</label>
                  <input
                    className="form-control"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={adjForm.amount}
                    onChange={e => setAdjForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">Reason for Adjustment</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    required
                    value={adjForm.reason}
                    onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Explain the reason for manual balance correction..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAdjModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
