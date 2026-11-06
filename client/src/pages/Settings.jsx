import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('business');
  const [users, setUsers] = useState([]);
  const [parties, setParties] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', fullName: '', role: 'STAFF' });
  const [activeTheme, setActiveTheme] = useState(() => {
    return typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') || 'light' : 'light';
  });

  useEffect(() => {
    api.get('/settings').then(res => { setSettings(res.data); setLoading(false); });
    if (isAdmin) {
      api.get('/auth/users').then(res => setUsers(res.data));
      api.get('/parties?limit=500').then(res => setParties(res.data.parties || []));
    }
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', {
        businessName: settings.business_name,
        address: settings.address,
        city: settings.city,
        state: settings.state,
        phone: settings.phone,
        email: settings.email,
        gstNumber: settings.gst_number,
        footerText: settings.footer_text,
        currentBillNumber: settings.current_bill_number,
        billPrefix: settings.bill_prefix,
        invoicePrefix: settings.invoice_prefix,
        defaultPaymentMethod: settings.default_payment_method,
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/users', userForm);
      setUsers(prev => [...prev, res.data]);
      toast.success('User created');
      setUserModal(false);
      setUserForm({ username: '', password: '', fullName: '', role: 'STAFF' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  if (loading) return <div className="page-container"><div className="loading-state"><div className="spinner" /></div></div>;

  const tabs = ['business', 'billing', 'users', 'parties', 'appearance'];

  const switchTheme = (mode) => {
    setActiveTheme(mode);
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('jsk_theme', mode);
    toast.success(`Theme switched to ${mode === 'dark' ? 'Midnight Ocean' : 'Coastal Light'}`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">Settings</div>
      </div>

      {!isAdmin && (
        <div className="alert alert-warning">Only administrators can modify settings.</div>
      )}

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: -2, fontFamily: 'inherit', textTransform: 'capitalize'
          }}>
            {t === 'billing' ? 'Bill Settings' : t === 'business' ? 'Business Info' : t === 'parties' ? 'Parties' : t === 'appearance' ? 'Theme & Appearance' : 'User Management'}
          </button>
        ))}
      </div>

      {tab === 'business' && (
        <div className="card">
          <form onSubmit={handleSave}>
            <div className="card-title" style={{ marginBottom: 16 }}>Business Information</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Business Name</label>
                <input className="form-control" required value={settings.business_name || ''}
                  onChange={e => setSettings(s => ({ ...s, business_name: e.target.value }))} disabled={!isAdmin} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={settings.phone || ''}
                  onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))} disabled={!isAdmin} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-control" value={settings.address || ''}
                onChange={e => setSettings(s => ({ ...s, address: e.target.value }))} disabled={!isAdmin} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-control" value={settings.city || ''}
                  onChange={e => setSettings(s => ({ ...s, city: e.target.value }))} disabled={!isAdmin} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-control" value={settings.state || ''}
                  onChange={e => setSettings(s => ({ ...s, state: e.target.value }))} disabled={!isAdmin} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={settings.email || ''}
                  onChange={e => setSettings(s => ({ ...s, email: e.target.value }))} disabled={!isAdmin} />
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-control" value={settings.gst_number || ''}
                  onChange={e => setSettings(s => ({ ...s, gst_number: e.target.value }))} disabled={!isAdmin} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Bill Footer Text</label>
              <input className="form-control" value={settings.footer_text || ''}
                onChange={e => setSettings(s => ({ ...s, footer_text: e.target.value }))} disabled={!isAdmin} />
            </div>
            {isAdmin && (
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
              </div>
            )}
          </form>
        </div>
      )}

      {tab === 'billing' && (
        <div className="card">
          <form onSubmit={handleSave}>
            <div className="card-title" style={{ marginBottom: 16 }}>Bill Configuration</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Bill Prefix</label>
                <input className="form-control" value={settings.bill_prefix || ''}
                  onChange={e => setSettings(s => ({ ...s, bill_prefix: e.target.value }))} disabled={!isAdmin}
                  placeholder="Leave empty for no prefix" />
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Prefix</label>
                <input className="form-control" value={settings.invoice_prefix || ''}
                  onChange={e => setSettings(s => ({ ...s, invoice_prefix: e.target.value }))} disabled={!isAdmin} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Current Bill Number</label>
                <input className="form-control" type="number" value={settings.current_bill_number || ''}
                  onChange={e => setSettings(s => ({ ...s, current_bill_number: e.target.value }))} disabled={!isAdmin} />
                <div className="form-hint">Next bill will be #{parseInt(settings.current_bill_number || 0) + 1}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Default Payment Method</label>
                <select className="form-control" value={settings.default_payment_method || 'Cash'}
                  onChange={e => setSettings(s => ({ ...s, default_payment_method: e.target.value }))} disabled={!isAdmin}>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            {isAdmin && (
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
              </div>
            )}
          </form>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">User Management</div>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setUserModal(true)}>+ Add User</button>
            )}
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.username}</td>
                    <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-staff'}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.is_active ? 'badge-paid' : 'badge-void'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {userModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Create New User</span>
              <button className="btn-close" onClick={() => setUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Full Name</label>
                  <input className="form-control" required value={userForm.fullName}
                    onChange={e => setUserForm(f => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Username</label>
                  <input className="form-control" required value={userForm.username}
                    onChange={e => setUserForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Password</label>
                  <input className="form-control" type="password" required value={userForm.password}
                    onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Role</label>
                  <select className="form-control" value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'parties' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Parties Management</div>
          </div>
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <strong>Warning:</strong> Deleting a party will permanently erase all associated bills, payments, and ledger entries for that party. This action cannot be undone.
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Party Name</th>
                  <th>Code</th>
                  <th>Balance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {parties.map(p => (
                  <tr key={p.id}>
                    <td>{p.party_name}</td>
                    <td>{p.party_code || '—'}</td>
                    <td>₹{parseFloat(p.current_balance).toLocaleString('en-IN')}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                        onClick={async () => {
                          if (window.confirm(`Are you absolutely sure you want to permanently delete "${p.party_name}" and all their history?`)) {
                            try {
                              await api.delete(`/parties/${p.id}`);
                              setParties(prev => prev.filter(party => party.id !== p.id));
                              toast.success('Party and history deleted successfully');
                            } catch (err) {
                              toast.error(err.response?.data?.error || 'Failed to delete party');
                            }
                          }
                        }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Theme & Visual Experience</div>
              <div className="card-subtitle-small">Customize the appearance of the JSK Fishers billing system</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 12 }}>
            {/* Coastal Light Option */}
            <div
              onClick={() => switchTheme('light')}
              style={{
                border: activeTheme === 'light' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                cursor: 'pointer',
                background: '#ffffff',
                boxShadow: activeTheme === 'light' ? '0 0 0 4px var(--color-primary-glow)' : 'var(--shadow-xs)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {activeTheme === 'light' && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'var(--color-primary)', color: '#fff',
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999
                }}>
                  ACTIVE
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: 'linear-gradient(135deg, #0284c7, #0d9488)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>
                  ☀️
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Coastal Light</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Crisp, high-clarity daylight theme</div>
                </div>
              </div>
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12,
                display: 'flex', gap: 8, alignItems: 'center'
              }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#0284c7' }} title="Ocean Blue" />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#0d9488' }} title="Teal" />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#059669' }} title="Emerald" />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#e11d48' }} title="Rose" />
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>High Contrast</span>
              </div>
            </div>

            {/* Midnight Ocean Option */}
            <div
              onClick={() => switchTheme('dark')}
              style={{
                border: activeTheme === 'dark' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                cursor: 'pointer',
                background: '#090e1a',
                color: '#f1f5f9',
                boxShadow: activeTheme === 'dark' ? '0 0 0 4px var(--color-primary-glow)' : 'var(--shadow-xs)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {activeTheme === 'dark' && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'var(--color-primary)', color: '#090e1a',
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999
                }}>
                  ACTIVE
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: 'linear-gradient(135deg, #091224, #0284c7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>
                  🌙
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Midnight Ocean</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Deep oceanic slate & glowing accents</div>
                </div>
              </div>
              <div style={{
                background: '#111927', border: '1px solid #1e293b', borderRadius: 8, padding: 12,
                display: 'flex', gap: 8, alignItems: 'center'
              }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#38bdf8' }} title="Cyan Blue" />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#2dd4bf' }} title="Teal" />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#34d399' }} title="Emerald" />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fb7185' }} title="Rose" />
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>Eye Friendly</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
