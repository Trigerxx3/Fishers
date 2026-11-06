import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Lock, User, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.fullName || res.data.user.username}!`);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="login-page-modern">
      {/* Ambient background decoration */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      <div className="login-container-card">
        {/* Brand header */}
        <div className="login-brand-section">
          <div className="login-logo-badge">
            <span className="login-fish-icon">🐟</span>
            <div className="login-badge-glow" />
          </div>
          <h1 className="login-brand-title">JSK Fishers</h1>
          <p className="login-brand-subtitle">Commission Agent Billing & Account Management</p>
          <div className="login-location-chip">
            <Sparkles size={12} />
            <span>Kanhangad Fish Market · Kasaragod</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="alert alert-error login-alert">
            <ShieldCheck size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label required">Username</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                className="form-control input-enhanced"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                className="form-control input-enhanced"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            className="btn btn-primary btn-login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading-flex">
                <span className="spinner-sm" />
                <span>Signing in...</span>
              </span>
            ) : (
              <span className="btn-loading-flex">
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        {/* Quick Demo Access Pills */}
        <div className="demo-credentials-card">
          <div className="demo-card-title">Quick Demo Login:</div>
          <div className="demo-pills-row">
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillCredentials('admin', 'admin123')}
            >
              <span className="demo-pill-role admin">Admin</span>
              <span className="demo-pill-text">admin / admin123</span>
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillCredentials('staff', 'staff123')}
            >
              <span className="demo-pill-role staff">Staff</span>
              <span className="demo-pill-text">staff / staff123</span>
            </button>
          </div>
        </div>

        <div className="login-footer-security">
          <span>Protected Fish Trade Accounting System · Kerala</span>
        </div>
      </div>
    </div>
  );
}
