import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { formatCurrency, formatDate, getStatusClass, getStatusLabel } from '../utils';
import toast from 'react-hot-toast';
import {
  FileText,
  PlusCircle,
  Search,
  RotateCcw,
  Eye,
  Edit2,
  Printer,
  Ban,
  AlertTriangle
} from 'lucide-react';

export default function BillBook() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', party: '', status: '' });
  const [voidModal, setVoidModal] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const LIMIT = 25;

  useEffect(() => {
    api.get('/parties?limit=200').then(res => setParties(res.data.parties || []));
  }, []);

  const loadBills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, ...filters });
      const res = await api.get(`/bills?${params}`);
      setBills(res.data.bills || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const handleVoid = async () => {
    if (!voidReason.trim()) { toast.error('Please enter a reason'); return; }
    try {
      await api.post(`/bills/${voidModal.id}/void`, { reason: voidReason });
      toast.success(`Bill #${voidModal.bill_number} voided`);
      setVoidModal(null);
      setVoidReason('');
      loadBills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to void bill');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">Bill Book</div>
          <div className="page-subtitle">Historical registry of all fish sales and commission vouchers ({total} records)</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/bills/new')}>
          <PlusCircle size={16} />
          <span>New Bill</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="input-with-icon search-input">
          <Search size={15} className="input-icon" />
          <input
            className="form-control input-enhanced"
            placeholder="Search bill no, party, phone..."
            value={filters.search}
            onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
          />
        </div>

        <input
          className="form-control"
          type="date"
          value={filters.dateFrom}
          onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
          title="From date"
        />
        <input
          className="form-control"
          type="date"
          value={filters.dateTo}
          onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }}
          title="To date"
        />

        <select
          className="form-control"
          value={filters.party}
          onChange={e => { setFilters(f => ({ ...f, party: e.target.value })); setPage(1); }}
        >
          <option value="">All Parties</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.party_name}</option>)}
        </select>

        <select
          className="form-control"
          value={filters.status}
          onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="DUE">Due (Unpaid)</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="VOID">Voided</option>
        </select>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setFilters({ search: '', dateFrom: '', dateTo: '', party: '', status: '' }); setPage(1); }}
          title="Reset filters"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      {/* Bills Table Card */}
      <div className="card card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Fetching bills directory...</span>
          </div>
        ) : bills.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={36} strokeWidth={1.5} />
            </div>
            <h3>No Bills Match Your Criteria</h3>
            <p>Try clearing filters or generate a new fish billing memo.</p>
            <button className="btn btn-primary" onClick={() => navigate('/bills/new')}>
              <PlusCircle size={16} />
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
                  <th>Party / Customer</th>
                  <th className="right">Gross Total</th>
                  <th className="right">Expenses</th>
                  <th className="right">Net Amount</th>
                  <th className="right">Paid</th>
                  <th className="right">Balance</th>
                  <th className="center">Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => {
                  const balanceNum = parseFloat(bill.balance || 0);
                  const isVoid = bill.status === 'VOID';
                  return (
                    <tr
                      key={bill.id}
                      className="table-row-hover"
                      style={{ opacity: isVoid ? 0.6 : 1 }}
                    >
                      <td>
                        <span className="bill-tag font-mono">#{bill.bill_number}</span>
                      </td>
                      <td className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(bill.bill_date)}
                      </td>
                      <td>
                        <div className="table-party-cell">
                          <span className="party-name-bold">{bill.party_name}</span>
                          {bill.party_phone && <span className="party-phone-micro">{bill.party_phone}</span>}
                        </div>
                      </td>
                      <td className="right amount-cell font-semibold">{formatCurrency(bill.gross_total)}</td>
                      <td className="right amount-cell text-muted">{formatCurrency(bill.total_expenses)}</td>
                      <td className="right amount-cell font-semibold">{formatCurrency(bill.net_amount)}</td>
                      <td className="right amount-cell text-success font-medium">{formatCurrency(bill.paid_amount)}</td>
                      <td className={`right amount-cell font-semibold ${balanceNum > 0 ? 'text-danger' : 'text-success'}`}>
                        {formatCurrency(bill.balance)}
                      </td>
                      <td className="center">
                        <span className={`badge-pill-status ${getStatusClass(bill.status)}`}>
                          <span className="status-dot" />
                          {getStatusLabel(bill.status)}
                        </span>
                      </td>
                      <td className="right">
                        <div className="actions-cell-modern">
                          <button
                            className="btn-action-icon"
                            onClick={() => navigate(`/bills/${bill.id}`)}
                            title="View Bill Details"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          {!isVoid && (
                            <>
                              <button
                                className="btn-action-icon"
                                onClick={() => navigate(`/bills/${bill.id}/edit`)}
                                title="Edit Bill"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="btn-action-icon btn-action-accent"
                                onClick={() => window.open(`/bills/${bill.id}/print`, '_blank')}
                                title="Print Memo"
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                className="btn-action-icon"
                                style={{ color: 'var(--color-danger)' }}
                                onClick={() => { setVoidModal(bill); setVoidReason(''); }}
                                title="Void Bill"
                              >
                                <Ban size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span className="page-info">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} bills)
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Void Confirmation Modal */}
      {voidModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVoidModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="var(--color-danger)" />
                <span>Void Bill #{voidModal.bill_number}?</span>
              </span>
              <button className="btn-close" onClick={() => setVoidModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning">
                Voiding this bill will automatically adjust the party's ledger balance. This transaction is permanently recorded in the system audit log.
              </div>
              <div className="form-group">
                <label className="form-label required">Reason for Voiding</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  placeholder="Specify the reason (e.g., duplicated invoice, order cancellation, erroneous party)..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setVoidModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleVoid}>Confirm Void</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
