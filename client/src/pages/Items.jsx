import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Fish, PlusCircle, Search, Edit2, Ban, CheckCircle } from 'lucide-react';

function ItemForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item ? {
    name: item.name, itemCode: item.item_code || '', defaultRate: item.default_rate || '',
    unit: item.unit || 'Box', isActive: item.is_active
  } : { name: '', itemCode: '', defaultRate: '', unit: 'Box' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (item) {
        await api.put(`/items/${item.id}`, form);
        toast.success('Fish item updated');
      } else {
        await api.post('/items', form);
        toast.success('Fish item added');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{item ? 'Edit Fish Item' : 'Add New Fish / Item'}</span>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label required">Fish Variety Name</label>
              <input
                className="form-control"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))}
                placeholder="e.g., MATHI, AYALA, NMEEN"
                autoFocus
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Item Code / Short Name</label>
                <input
                  className="form-control"
                  value={form.itemCode}
                  onChange={e => setForm(f => ({ ...f, itemCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g., MTH, AYL"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Billing Unit</label>
                <select
                  className="form-control"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                >
                  <option>Box</option>
                  <option>Kg</option>
                  <option>Piece</option>
                  <option>Crate</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Default Rate per Unit (₹)</label>
              <input
                className="form-control"
                type="number"
                value={form.defaultRate}
                onChange={e => setForm(f => ({ ...f, defaultRate: e.target.value }))}
                placeholder="0.00"
              />
              <div className="form-hint">Default rate automatically fills in billing but can be altered per auction</div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Items() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/items?search=${search}`);
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const deactivate = async (item) => {
    if (!window.confirm(`Deactivate "${item.name}" from billing?`)) return;
    try {
      await api.delete(`/items/${item.id}`);
      toast.success('Fish item deactivated');
      load();
    } catch {
      toast.error('Failed to deactivate item');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">Fish & Items Catalog</div>
          <div className="page-subtitle">Species, default auction rates, and box packaging types ({items.length} varieties)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <PlusCircle size={16} />
          <span>Add Fish Item</span>
        </button>
      </div>

      <div className="filters-bar">
        <div className="input-with-icon search-input">
          <Search size={15} className="input-icon" />
          <input
            className="form-control input-enhanced"
            placeholder="Search fish name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading fish catalog...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Fish size={36} strokeWidth={1.5} />
            </div>
            <h3>No Fish Varieties Found</h3>
            <p>Add common fish species and their standard box rates to speed up billing.</p>
            <button className="btn btn-primary" onClick={() => setModal('new')}>
              <PlusCircle size={16} />
              <span>Add First Fish Variety</span>
            </button>
          </div>
        ) : (
          <div className="table-container table-flush">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Fish Variety</th>
                  <th>Code</th>
                  <th>Unit</th>
                  <th className="right">Default Rate (₹)</th>
                  <th className="center">Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="table-row-hover" style={{ opacity: item.is_active ? 1 : 0.55 }}>
                    <td>
                      <div className="party-name-bold">{item.name}</div>
                    </td>
                    <td>
                      <span className="font-mono text-secondary">{item.item_code || '—'}</span>
                    </td>
                    <td>
                      <span className="stat-tag tag-blue">{item.unit}</span>
                    </td>
                    <td className="right amount-cell font-semibold">
                      {item.default_rate ? `₹${parseFloat(item.default_rate).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="center">
                      <span className={`badge-pill-status ${item.is_active ? 'badge-paid' : 'badge-void'}`}>
                        <span className="status-dot" />
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="right">
                      <div className="actions-cell-modern">
                        <button
                          className="btn-action-icon"
                          onClick={() => setModal(item)}
                          title="Edit Variety"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        {item.is_active && (
                          <button
                            className="btn-action-icon"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => deactivate(item)}
                            title="Deactivate Variety"
                          >
                            <Ban size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ItemForm
          item={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
