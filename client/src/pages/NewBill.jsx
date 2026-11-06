import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { formatCurrency, computeBillFinancials, today } from '../utils';
import toast from 'react-hot-toast';

const emptyItem = () => ({ id: Date.now() + Math.random(), fishItemId: '', item_name: '', box: '', quantity: '', rate: '', total: 0 });

function PartyModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ partyName: '', partyCode: '', phone: '', address: '', openingBalance: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/parties', form);
      toast.success('Party created!');
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create party');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add New Party</span>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label required">Party Name</label>
              <input className="form-control" required value={form.partyName}
                onChange={e => setForm(f => ({ ...f, partyName: e.target.value }))} autoFocus />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Party Code</label>
                <input className="form-control" value={form.partyCode}
                  onChange={e => setForm(f => ({ ...f, partyCode: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-control" rows={2} value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Opening Balance (₹)</label>
              <input className="form-control" type="number" value={form.openingBalance}
                onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Party'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewBill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [fishItems, setFishItems] = useState([]);
  const [partySearch, setPartySearch] = useState('');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    partyId: '',
    partyName: '',
    billDate: today(),
    items: [emptyItem()],
    commission: '',
    vehicleRent: '',
    unloading: '',
    oldBalance: '0',
    paidAmount: '',
    paymentMethod: 'Cash',
    notes: '',
  });

  const [financials, setFinancials] = useState({
    grossTotal: 0, totalExpenses: 0, netAmount: 0, oldBalance: 0,
    totalDue: 0, paidAmount: 0, balance: 0, status: 'DUE'
  });

  // Recalculate financials on change
  useEffect(() => {
    const f = computeBillFinancials(
      form.items, form.commission, form.vehicleRent, form.unloading,
      form.oldBalance, form.paidAmount
    );
    setFinancials(f);
  }, [form.items, form.commission, form.vehicleRent, form.unloading, form.oldBalance, form.paidAmount]);

  // Load parties & fish items
  useEffect(() => {
    api.get('/parties?active=true&limit=200').then(res => setParties(res.data.parties || []));
    api.get('/items?active=true').then(res => setFishItems(res.data || []));
  }, []);

  // Load bill for editing
  useEffect(() => {
    if (!id) return;
    api.get(`/bills/${id}`).then(res => {
      const b = res.data.bill;
      const items = res.data.items.map(i => ({
        id: i.id, fishItemId: i.fish_item_id || '', item_name: i.item_name,
        box: i.box, quantity: i.quantity, rate: i.rate, total: i.total
      }));
      setForm({
        partyId: b.party_id, partyName: b.party_name,
        billDate: b.bill_date?.split('T')[0] || today(),
        items: items.length > 0 ? items : [emptyItem()],
        commission: b.commission, vehicleRent: b.vehicle_rent,
        unloading: b.unloading, oldBalance: b.old_balance,
        paidAmount: b.paid_amount, paymentMethod: b.payment_method || 'Cash',
        notes: b.notes || '',
      });
    }).catch(() => toast.error('Failed to load bill'));
  }, [id]);

  // Select party and fetch old balance
  const selectParty = async (party) => {
    setForm(f => ({ ...f, partyId: party.id, partyName: party.party_name }));
    setPartySearch(party.party_name);
    setShowPartyDropdown(false);
    // Fetch current balance
    try {
      const res = await api.get(`/parties/${party.id}`);
      setForm(f => ({ ...f, oldBalance: res.data.party.current_balance || '0' }));
    } catch {}
  };

  // Item field change
  const updateItem = (index, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[index] = { ...items[index], [field]: value };
      // Auto-select fish item name
      if (field === 'fishItemId') {
        const fish = fishItems.find(fi => fi.id === parseInt(value));
        if (fish) {
          items[index].item_name = fish.name;
          if (!items[index].rate && fish.default_rate) {
            items[index].rate = fish.default_rate;
          }
        }
      }
      return { ...f, items };
    });
  };

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  };

  const removeItem = (index) => {
    setForm(f => {
      if (f.items.length === 1) return f;
      const items = f.items.filter((_, i) => i !== index);
      return { ...f, items };
    });
  };

  // Keyboard: Tab on Rate → add new row
  const handleRateKeyDown = (e, index) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && index === form.items.length - 1) {
      e.preventDefault();
      addItem();
      setTimeout(() => {
        const rows = document.querySelectorAll('.bill-items-table tbody tr');
        const nextRow = rows[index + 1];
        if (nextRow) {
          const firstInput = nextRow.querySelector('input, select');
          if (firstInput) firstInput.focus();
        }
      }, 50);
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(false); }
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); handleSave(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [form]);

  const handleSave = async (andPrint = false) => {
    if (!form.partyId) { toast.error('Please select a party'); return; }
    if (form.items.some(i => !i.item_name || i.item_name.trim() === '')) {
      toast.error('Item name is required for all rows'); return;
    }
    if (form.items.some(i => !i.rate || parseFloat(i.rate) <= 0)) {
      toast.error('Rate must be greater than 0 for all items'); return;
    }

    setSaving(true);
    try {
      const payload = {
        partyId: form.partyId,
        billDate: form.billDate,
        items: form.items.map(i => ({
          fishItemId: i.fishItemId || null,
          item_name: i.item_name,
          box: parseFloat(i.box) || 0,
          quantity: parseFloat(i.quantity) || 0,
          rate: parseFloat(i.rate),
        })),
        commission: parseFloat(form.commission) || 0,
        vehicleRent: parseFloat(form.vehicleRent) || 0,
        unloading: parseFloat(form.unloading) || 0,
        oldBalance: parseFloat(form.oldBalance) || 0,
        paidAmount: parseFloat(form.paidAmount) || 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      };

      let res;
      if (id) {
        res = await api.put(`/bills/${id}`, payload);
        toast.success('Bill updated successfully!');
      } else {
        res = await api.post('/bills', payload);
        toast.success(`Bill #${res.data.bill.bill_number} created!`);
      }

      const billId = id || res.data.bill.id;
      if (andPrint) {
        window.open(`/bills/${billId}/print`, '_blank');
      }
      navigate(`/bills/${billId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const filteredParties = parties.filter(p =>
    p.party_name.toLowerCase().includes(partySearch.toLowerCase()) ||
    (p.phone && p.phone.includes(partySearch))
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">{id ? 'Edit Bill' : 'New Bill'}</div>
          <div className="page-subtitle" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Ctrl+S: Save · Ctrl+P: Save & Print · Tab/Enter: Next Row
          </div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={() => navigate('/bills')}>Cancel</button>
          <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Bill'}
          </button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Print'}
          </button>
        </div>
      </div>

      <div className="bill-editor-layout">
        {/* Left: Bill form */}
        <div className="bill-editor-main">
          {/* Bill header */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>Bill Information</div>
            <div className="grid-2">
              {/* Party Search */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label required">Party</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Search party name or phone..."
                  value={partySearch}
                  onChange={e => { setPartySearch(e.target.value); setShowPartyDropdown(true); setForm(f => ({ ...f, partyId: '', partyName: '' })); }}
                  onFocus={() => setShowPartyDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                />
                {showPartyDropdown && filteredParties.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 8, boxShadow: 'var(--shadow-lg)',
                    zIndex: 50, maxHeight: 220, overflowY: 'auto', marginTop: 4
                  }}>
                    {filteredParties.slice(0, 10).map(p => (
                      <div key={p.id}
                        style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--color-border-light)', transition: 'background-color 0.15s ease' }}
                        onMouseDown={() => selectParty(p)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{p.party_name}</div>
                        {p.phone && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 4, fontSize: 12, padding: '3px 8px' }}
                  onClick={() => setShowPartyModal(true)}
                >
                  + Add New Party
                </button>
              </div>
              <div className="form-group">
                <label className="form-label required">Date</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.billDate}
                  onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
              <div className="card-title">Items</div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={addItem}>+ Add Item</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="bill-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Particulars</th>
                    <th style={{ width: '12%' }}>Box</th>
                    <th style={{ width: '12%' }}>Qty</th>
                    <th style={{ width: '16%' }}>Rate (₹)</th>
                    <th style={{ width: '16%', textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ width: '9%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => {
                    const box = parseFloat(item.box) || 0;
                    const rate = parseFloat(item.rate) || 0;
                    const total = box * rate;
                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            list={`fish-list-${idx}`}
                            value={item.item_name}
                            placeholder="Fish name..."
                            onChange={e => {
                              const name = e.target.value.toUpperCase();
                              updateItem(idx, 'item_name', name);
                              const fish = fishItems.find(f => f.name.toUpperCase() === name);
                              if (fish) {
                                updateItem(idx, 'fishItemId', fish.id);
                                if (!item.rate && fish.default_rate) updateItem(idx, 'rate', fish.default_rate);
                              }
                            }}
                            style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 13, background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px var(--color-primary-glow)'; }}
                            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                          />
                          <datalist id={`fish-list-${idx}`}>
                            {fishItems.map(f => <option key={f.id} value={f.name} />)}
                          </datalist>
                        </td>
                        <td>
                          <input type="number" value={item.box} min="0" step="0.5"
                            placeholder="0"
                            onChange={e => updateItem(idx, 'box', e.target.value)}
                            style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 13, textAlign: 'right', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px var(--color-primary-glow)'; }}
                            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </td>
                        <td>
                          <input type="number" value={item.quantity} min="0"
                            placeholder="0"
                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                            style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 13, textAlign: 'right', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px var(--color-primary-glow)'; }}
                            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </td>
                        <td>
                          <input type="number" value={item.rate} min="0" step="0.01"
                            placeholder="0"
                            onChange={e => updateItem(idx, 'rate', e.target.value)}
                            onKeyDown={e => handleRateKeyDown(e, idx)}
                            style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 13, textAlign: 'right', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px var(--color-primary-glow)'; }}
                            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </td>
                        <td className="bill-total-cell">{total > 0 ? total.toLocaleString('en-IN') : '-'}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeItem(idx)}
                            style={{ color: 'var(--color-danger)', padding: '2px 6px' }}
                            title="Remove row"
                          >✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" style={{ padding: '10px 8px', fontWeight: 700, fontSize: 14, textAlign: 'right', borderTop: '2px solid var(--color-border)', color: 'var(--color-text)' }}>
                      GROSS TOTAL
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 14, textAlign: 'right', borderTop: '2px solid var(--color-border)', fontVariantNumeric: 'tabular-nums' }}>
                      {financials.grossTotal.toLocaleString('en-IN')}
                    </td>
                    <td style={{ borderTop: '2px solid var(--color-border)' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={addItem}>
              + Add Item
            </button>
          </div>
        </div>

        {/* Right: Financial Summary */}
        <div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Financial Summary</div>

            <div className="financial-summary">
              <div className="financial-row total-row">
                <span>GROSS TOTAL</span>
                <span className="financial-value">{formatCurrency(financials.grossTotal)}</span>
              </div>

              <div style={{ padding: '10px 16px 6px', background: '#fafbfc' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Expenses
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Commission</label>
                  <input
                    className="financial-input"
                    type="number" min="0" step="0.01"
                    placeholder="0"
                    value={form.commission}
                    onChange={e => setForm(f => ({ ...f, commission: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Vehicle Rent</label>
                  <input
                    className="financial-input"
                    type="number" min="0" step="0.01"
                    placeholder="0"
                    value={form.vehicleRent}
                    onChange={e => setForm(f => ({ ...f, vehicleRent: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Unloading</label>
                  <input
                    className="financial-input"
                    type="number" min="0" step="0.01"
                    placeholder="0"
                    value={form.unloading}
                    onChange={e => setForm(f => ({ ...f, unloading: e.target.value }))}
                  />
                </div>
              </div>

              <div className="financial-row deduction">
                <span>Total Expenses</span>
                <span className="financial-value">({formatCurrency(financials.totalExpenses)})</span>
              </div>

              <div className="financial-row total-row" style={{ background: '#e8f0fe' }}>
                <span style={{ color: 'var(--color-primary)' }}>NET AMOUNT</span>
                <span className="financial-value" style={{ color: 'var(--color-primary)' }}>{formatCurrency(financials.netAmount)}</span>
              </div>

              <div className="financial-row" style={{ background: '#fff8e6' }}>
                <span style={{ color: 'var(--color-warning)' }}>Old Balance</span>
                <span className="financial-value" style={{ color: 'var(--color-warning)' }}>
                  {formatCurrency(form.oldBalance || 0)}
                </span>
              </div>

              <div className="financial-row total-row">
                <span>TOTAL DUE</span>
                <span className="financial-value">{formatCurrency(financials.totalDue)}</span>
              </div>

              <div style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Paid</label>
                  <input
                    className="financial-input"
                    type="number" min="0" step="0.01"
                    placeholder="0"
                    value={form.paidAmount}
                    onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))}
                    style={{ borderColor: 'var(--color-primary)' }}
                  />
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Payment Method</label>
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
              </div>

              <div className="financial-row grand-total">
                <span>BALANCE</span>
                <span className="financial-value">{formatCurrency(financials.balance)}</span>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>Status</span>
              <span className={`badge ${financials.status === 'PAID' ? 'badge-paid' : financials.status === 'PARTIAL' ? 'badge-partial' : 'badge-due'}`}>
                {financials.status}
              </span>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..." />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary btn-lg" onClick={() => handleSave(true)} disabled={saving}>
                {saving ? 'Saving...' : 'Save & Print'}
              </button>
              <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? 'Saving...' : 'Save Only'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPartyModal && (
        <PartyModal
          onClose={() => setShowPartyModal(false)}
          onCreated={(party) => {
            setParties(prev => [...prev, party]);
            selectParty(party);
          }}
        />
      )}
    </div>
  );
}
