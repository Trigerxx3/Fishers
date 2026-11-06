import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { formatCurrency, formatDate } from '../utils';
import toast from 'react-hot-toast';
import {
  Users,
  PlusCircle,
  Search,
  Eye,
  Edit2,
  BookOpen
} from 'lucide-react';

function PartyForm({ party, onClose, onSaved }) {
  const [form, setForm] = useState(party ? {
    partyName: party.party_name, partyCode: party.party_code || '',
    phone: party.phone || '', address: party.address || '',
    gstNumber: party.gst_number || '', notes: party.notes || '', isActive: party.is_active
  } : {
    partyName: '', partyCode: '', phone: '', address: '',
    gstNumber: '', openingBalance: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (party) {
        await api.put(`/parties/${party.id}`, form);
        toast.success('Party updated');
      } else {
        await api.post('/parties', form);
        toast.success('Party created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save party');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{party ? 'Edit Party Details' : 'Register New Party'}</span>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Party Name</label>
                <input
                  className="form-control"
                  required
                  value={form.partyName}
                  onChange={e => setForm(f => ({ ...f, partyName: e.target.value }))}
                  placeholder="e.g., Al-Madina Traders"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Party Code</label>
                <input
                  className="form-control"
                  value={form.partyCode}
                  onChange={e => setForm(f => ({ ...f, partyCode: e.target.value }))}
                  placeholder="e.g., ALM"
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input
                  className="form-control"
                  value={form.gstNumber}
                  onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))}
                  placeholder="GSTIN (optional)"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Market Address / Stall</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Market stall number, harbor location, or town..."
              />
            </div>
            {!party && (
              <div className="form-group">
                <label className="form-label">Opening Balance (₹)</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.openingBalance}
                  onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))}
                  placeholder="0.00"
                />
                <div className="form-hint">Existing balance prior to starting billing on this system</div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Remarks / Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Special settlement agreements, credit terms, etc."
              />
            </div>
            {party && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span>Active Trading Party</span>
                </label>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Parties() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const loadParties = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parties?search=${search}&page=${page}&limit=${LIMIT}`);
      setParties(res.data.parties || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">Parties Directory</div>
          <div className="page-subtitle">Fish buyers, retail merchants, and trading accounts ({total} parties)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <PlusCircle size={16} />
          <span>Add Party</span>
        </button>
      </div>

      <div className="filters-bar">
        <div className="input-with-icon search-input">
          <Search size={15} className="input-icon" />
          <input
            className="form-control input-enhanced"
            placeholder="Search party name, phone, code..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading parties registry...</span>
          </div>
        ) : parties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={36} strokeWidth={1.5} />
            </div>
            <h3>No Parties Found</h3>
            <p>Register trading customers and merchants to start issuing bills.</p>
            <button className="btn btn-primary" onClick={() => setModal('new')}>
              <PlusCircle size={16} />
              <span>Add First Party</span>
            </button>
          </div>
        ) : (
          <div className="table-container table-flush">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Party Name</th>
                  <th>Code</th>
                  <th>Phone</th>
                  <th className="right">Outstanding Balance</th>
                  <th>Last Transaction</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parties.map(p => {
                  const bal = parseFloat(p.current_balance || 0);
                  return (
                    <tr key={p.id} className="table-row-hover">
                      <td>
                        <div className="party-name-bold">{p.party_name}</div>
                        {!p.is_active && (
                          <span className="badge-pill-status badge-void" style={{ fontSize: 9.5, marginTop: 3 }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-secondary">{p.party_code || '—'}</span>
                      </td>
                      <td className="text-secondary">{p.phone || '—'}</td>
                      <td className="right amount-cell font-semibold">
                        <span className={bal > 0 ? 'text-danger' : 'text-success'}>
                          {formatCurrency(p.current_balance)}
                        </span>
                      </td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {p.last_transaction ? formatDate(p.last_transaction) : '—'}
                      </td>
                      <td className="right">
                        <div className="actions-cell-modern">
                          <button
                            className="btn-action-icon"
                            onClick={() => navigate(`/parties/${p.id}`)}
                            title="View Party Account"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          <button
                            className="btn-action-icon"
                            onClick={() => setModal(p)}
                            title="Edit Details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn-action-icon btn-action-accent"
                            onClick={() => navigate(`/parties/${p.id}/ledger`)}
                            title="View Statement / Ledger"
                          >
                            <BookOpen size={13} />
                            <span>Ledger</span>
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

      {modal && (
        <PartyForm
          party={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={loadParties}
        />
      )}
    </div>
  );
}
