import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Users,
  CreditCard,
  Fish,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Compass,
  MoreHorizontal
} from 'lucide-react';

function NavItem({ to, icon: Icon, label, current, onClick }) {
  const active = current === to || (to !== '/' && current.startsWith(to));
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={() => onClick(to)}>
      <span className="nav-icon-wrapper">
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="nav-label-text">{label}</span>
      {active && <span className="nav-active-pill" />}
    </button>
  );
}

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('jsk_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jsk_theme', theme);
  }, [theme]);

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Global keyboard shortcut: Ctrl+N for New Bill
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          navigate('/bills/new');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/bills/new', icon: PlusCircle, label: 'New Bill' },
    { to: '/bills', icon: FileText, label: 'Bill Book' },
    { to: '/parties', icon: Users, label: 'Parties' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/items', icon: Fish, label: 'Fish / Items' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
  ];

  const adminItems = [
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  const getPageTitle = (path) => {
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/bills/new')) return 'New Bill';
    if (path.startsWith('/bills')) return 'Bill Book';
    if (path.startsWith('/parties')) return 'Parties Directory';
    if (path.startsWith('/payments')) return 'Payments & Receipts';
    if (path.startsWith('/items')) return 'Fish & Items Catalog';
    if (path.startsWith('/reports')) return 'Reports & Analytics';
    if (path.startsWith('/settings')) return 'System Settings';
    return 'JSK Fishers';
  };

  const isCurrent = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Off-canvas drawer */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand-wrapper">
          <div className="sidebar-brand-row">
            <div className="sidebar-logo">
              <div className="brand-icon-box">
                <span className="brand-emoji">🐟</span>
                <div className="brand-glow" />
              </div>
              <div className="brand-info">
                <div className="business-name">JSK Fishers</div>
                <div className="business-sub">Kanhangad Fish Market</div>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              className="sidebar-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="market-status-badge">
            <span className="pulse-dot" />
            <span className="status-text">Market Active</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Navigation</div>
          {navItems.map(item => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              current={location.pathname}
              onClick={handleNav}
            />
          ))}

          {isAdmin && (
            <>
              <div className="nav-label nav-label-spaced">Administration</div>
              {adminItems.map(item => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  current={location.pathname}
                  onClick={handleNav}
                />
              ))}
            </>
          )}
        </nav>

        {/* Sidebar Footer with User Card & Theme Switch */}
        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-info">
              <div className="user-avatar-modern">
                {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
              </div>
              <div className="user-text">
                <div className="user-name">{user?.fullName || user?.username}</div>
                <div className="user-role-badge">
                  <span className={`badge-pill ${user?.role === 'ADMIN' ? 'role-admin' : 'role-staff'}`}>
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="user-actions-row">
              <button
                className="btn-theme-toggle"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
              <button
                className="btn-signout"
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="main-viewport">
        {/* Modern Topbar Header */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="topbar-menu-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <div className="topbar-mobile-brand">
              <span className="mobile-brand-fish">🐟</span>
              <span className="mobile-brand-title">JSK Fishers</span>
            </div>
            <div className="topbar-breadcrumbs">
              <span className="breadcrumb-root">JSK</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{getPageTitle(location.pathname)}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-date-pill">
              <Compass size={14} className="topbar-date-icon" />
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>

            <button
              className="topbar-theme-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
              aria-label="Switch theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {location.pathname !== '/bills/new' && (
              <button
                className="btn-topbar-action"
                onClick={() => navigate('/bills/new')}
                title="Create a new fish sale bill (Ctrl+N)"
              >
                <PlusCircle size={15} />
                <span className="btn-topbar-action-text">New Bill</span>
                <kbd className="kbd-shortcut">Ctrl+N</kbd>
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          {children}
        </main>

        {/* Mobile Phone Bottom Navigation Bar */}
        <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
          <button
            className={`mobile-tab-btn ${isCurrent('/') && location.pathname === '/' ? 'active' : ''}`}
            onClick={() => handleNav('/')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>

          <button
            className={`mobile-tab-btn ${isCurrent('/bills') && location.pathname !== '/bills/new' ? 'active' : ''}`}
            onClick={() => handleNav('/bills')}
          >
            <FileText size={20} />
            <span>Bills</span>
          </button>

          {/* Central Floating "+ New Bill" Action */}
          <button
            className={`mobile-tab-action-center ${isCurrent('/bills/new') ? 'active' : ''}`}
            onClick={() => handleNav('/bills/new')}
            aria-label="Create New Bill"
          >
            <div className="mobile-action-circle">
              <PlusCircle size={24} strokeWidth={2.4} />
            </div>
            <span className="mobile-action-label">New Bill</span>
          </button>

          <button
            className={`mobile-tab-btn ${isCurrent('/parties') ? 'active' : ''}`}
            onClick={() => handleNav('/parties')}
          >
            <Users size={20} />
            <span>Parties</span>
          </button>

          <button
            className={`mobile-tab-btn ${mobileOpen ? 'active' : ''}`}
            onClick={() => setMobileOpen(true)}
            aria-label="More Menu"
          >
            <MoreHorizontal size={20} />
            <span>Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
