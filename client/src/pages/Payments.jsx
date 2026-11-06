import { useState, useEffect } from 'react';
import api from '../api';
import { formatCurrency, formatDate, today } from '../utils';
import toast from 'react-hot-toast';
import { CreditCard, PlusCircle, RotateCcw } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [parties, setParties] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ partyId: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const [form, setForm] = useState({
    partyId: '', billId: '', amount: '', paymentMethod: 'Cash',
    paymentDate: today(), notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/parties?limit=200').then(res => setParties(res.data.parties || []));
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, ...filters });
      const res = await api.get(`/payments?${params}`);
      setPayments(res.data.payments || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  // Load unpaid bills when party is selected in modal
  useEffect(() => {
    if (form.partyId) {
      api.get(`/bills?party=${form.partyId}&status=DUE&limit=50`)
        .then(res => {
          const dues = res.data.bills || [];
          api.get(`/bills?party=${form.partyId}&status=PARTIAL&limit=50`)
            .then(res2 => setBills([...dues, ...(res2.data.bills || [])]));
        });
    } else {
      setBills([]);
    }
  }, [form.partyId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.partyId) { toast.error('Please select a party'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Amount must be greater than 0'); return; }
    setSaving(true);
    try {
      await api.post('/payments', form);
      toast.success('Payment recorded successfully');
      setShowModal(false);
      setForm({ partyId: '', billId: '', amount: '', paymentMethod: 'Cash', paymentDate: today(), notes: '' });
      loadPayments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">Payments & Collections</div>
          <div className="page-subtitle">Cash, UPI, and bank receipts recorded from parties ({total} receipts)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={16} />
          <span>Record Payment</span>
        </button>
      </div>

      <div className="filters-bar">
        <select
          className="form-control"
          value={filters.partyId}
          onChange={e => { setFilters(f => ({ ...f, partyId: e.target.value })); setPage(1); }}
        >
          <option value="">All Parties</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.party_name}</option>)}
        </select>
        <input
          className="form-control"
          type="date"
          value={filters.dateFrom}
          onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
          title="From Date"
        />
        <input
          className="form-control"
          type="date"
          value={filters.dateTo}
          onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }}
          title="To Date"
        />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setFilters({ partyId: '', dateFrom: '', dateTo: '' }); setPage(1); }}
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      <div className="card card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading payments...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <CreditCard size={36} strokeWidth={1.5} />
            </div>
            <h3>No Payments Found</h3>
            <p>Record receipts from fish merchants and parties to reconcile balances.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <PlusCircle size={16} />
              <span>Record First Payment</span>
            </button>
          </div>
        ) : (
          <div className="table-container table-flush">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Voucher Code</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th>Linked Bill</th>
                  <th className="right">Amount Received</th>
                  <th>Method</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="table-row-hover" style={{ opacity: p.is_void ? 0.5 : 1 }}>
                    <td>
                      <span className="font-mono text-secondary" style={{ fontSize: 12 }}>
                        {p.payment_code}
                      </span>
                    </td>
                    <td className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="font-semibold">{p.party_name}</td>
                    <td>
                      {p.bill_number ? (
                        <span className="bill-tag">#{p.bill_number}</span>
                      ) : (
                        <span className="text-muted">On Account</span>
                      )}
                    </td>
                    <td className="right amount-cell text-success font-semibold">
                      {formatCurrency(p.amount)}
                    </td>
                    <td>
                      <span className="badge-pill-status badge-paid">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      {p.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {Math.ceil(total / LIMIT) > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span className="page-info">
              Page <strong>{page}</strong> of <strong>{Math.ceil(total / LIMIT)}</strong>
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / LIMIT)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Record Payment Receipt</span>
              <button className="btn-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Party</label>
                  <select
                    className="form-control"
                    required
                    value={form.partyId}
                    onChange={e => setForm(f => ({ ...f, partyId: e.target.value, billId: '' }))}
                  >
                    <option value="">Select party...</option>
                    {parties.map(p => {
                      const curBal = parseFloat(p.current_balance || 0);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.party_name} {curBal > 0 ? `(Due: ₹${curBal.toLocaleString('en-IN')})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Link to Specific Bill (Optional)</label>
                  <select
                    className="form-control"
                    value={form.billId}
                    onChange={e => setForm(f => ({ ...f, billId: e.target.value }))}
                  >
                    <option value="">General payment (applied to balance)</option>
                    {bills.map(b => (
                      <option key={b.id} value={b.id}>
                        Bill #{b.bill_number} — Due: ₹{parseFloat(b.balance).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label required">Amount Received (₹)</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Date</label>
                    <input
                      className="form-control"
                      type="date"
                      required
                      value={form.paymentDate}
                      onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-control"
                    value={form.paymentMethod}
                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <input
                    className="form-control"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Transaction reference, cheque no., or comments..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
