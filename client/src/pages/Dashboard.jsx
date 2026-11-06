import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getStatusClass, getStatusLabel } from '../utils';
import {
  FileText,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Percent,
  Truck,
  PlusCircle,
  Users,
  Eye,
  Printer,
  ArrowRight,
  Fish,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    api.get('/dashboard/summary').then(res => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-container">
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading market dashboard data...</span>
      </div>
    </div>
  );

  const s = stats || {};

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="hero-greeting-badge">
            <Sparkles size={13} className="hero-sparkle" />
            <span>Kanhangad Fish Market</span>
          </div>
          <h1 className="hero-title">
            Welcome back, {user?.fullName || user?.username || 'Trader'}
          </h1>
          <p className="hero-subtitle">
            Here's what's happening in your fish trade and accounts today.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <div className="hero-date-chip">
            <Calendar size={14} />
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <button className="btn btn-primary btn-hero" onClick={() => navigate('/bills/new')}>
            <PlusCircle size={16} />
            <span>Create New Bill</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="stats-grid-modern">
        {/* Today's Bills */}
        <div className="stat-card-modern stat-theme-blue">
          <div className="stat-card-top">
            <span className="stat-label-modern">Today's Bills</span>
            <div className="stat-icon-wrapper stat-icon-blue">
              <FileText size={18} />
            </div>
          </div>
          <div className="stat-value-modern">{s.todayBillCount || 0}</div>
          <div className="stat-card-footer">
            <span className="stat-tag tag-blue">Invoices Generated</span>
          </div>
        </div>

        {/* Gross Sales */}
        <div className="stat-card-modern stat-theme-emerald">
          <div className="stat-card-top">
            <span className="stat-label-modern">Gross Turnover</span>
            <div className="stat-icon-wrapper stat-icon-emerald">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value-modern currency-val">{formatCurrency(s.todayGrossSales)}</div>
          <div className="stat-card-footer">
            <span className="stat-tag tag-emerald">Total Sales Value</span>
          </div>
        </div>

        {/* Payments Received */}
        <div className="stat-card-modern stat-theme-teal">
          <div className="stat-card-top">
            <span className="stat-label-modern">Payments Received</span>
            <div className="stat-icon-wrapper stat-icon-teal">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="stat-value-modern currency-val text-success">{formatCurrency(s.todayPaymentsReceived)}</div>
          <div className="stat-card-footer">
            <span className="stat-tag tag-teal">Collected Today</span>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="stat-card-modern stat-theme-rose">
          <div className="stat-card-top">
            <span className="stat-label-modern">Total Outstanding</span>
            <div className="stat-icon-wrapper stat-icon-rose">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="stat-value-modern currency-val text-danger">{formatCurrency(s.totalOutstanding)}</div>
          <div className="stat-card-footer">
            <span className="stat-tag tag-rose">Receivable from Parties</span>
          </div>
        </div>

        {/* Commission */}
        <div className="stat-card-modern stat-theme-indigo">
          <div className="stat-card-top">
            <span className="stat-label-modern">Commission</span>
            <div className="stat-icon-wrapper stat-icon-indigo">
              <Percent size={18} />
            </div>
          </div>
          <div className="stat-value-modern currency-val text-indigo">{formatCurrency(s.todayCommission)}</div>
          <div className="stat-card-footer">
            <span className="stat-tag tag-indigo">Agent Earnings</span>
          </div>
        </div>

        {/* Market Expenses */}
        <div className="stat-card-modern stat-theme-amber">
          <div className="stat-card-top">
            <span className="stat-label-modern">Market Expenses</span>
            <div className="stat-icon-wrapper stat-icon-amber">
              <Truck size={18} />
            </div>
          </div>
          <div className="stat-value-modern currency-val text-warning">{formatCurrency(s.todayExpenses)}</div>
          <div className="stat-card-footer">
            <span className="stat-tag tag-amber">Freight & Handling</span>
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div className="quick-actions-bar">
        <span className="quick-actions-label">Quick Actions:</span>
        <div className="quick-action-buttons">
          <button className="quick-action-pill" onClick={() => navigate('/bills/new')}>
            <PlusCircle size={14} />
            <span>New Bill</span>
          </button>
          <button className="quick-action-pill" onClick={() => navigate('/parties')}>
            <Users size={14} />
            <span>Parties Directory</span>
          </button>
          <button className="quick-action-pill" onClick={() => navigate('/payments')}>
            <CreditCard size={14} />
            <span>Record Payment</span>
          </button>
          <button className="quick-action-pill" onClick={() => navigate('/items')}>
            <Fish size={14} />
            <span>Fish Catalog</span>
          </button>
        </div>
      </div>

      {/* Recent Bills Card */}
      <div className="card card-elevated">
        <div className="card-header card-header-flex">
          <div>
            <div className="card-title">Recent Transactions</div>
            <div className="card-subtitle-small">Latest fish bills recorded in the market book</div>
          </div>
          <button className="btn btn-secondary btn-sm btn-icon-text" onClick={() => navigate('/bills')}>
            <span>View All Bills</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {(!s.recentBills || s.recentBills.length === 0) ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={36} strokeWidth={1.5} />
            </div>
            <h3>No Bills Created Yet</h3>
            <p>Start recording fish deliveries and commission bills today.</p>
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
                  <th className="right">Paid</th>
                  <th className="right">Balance</th>
                  <th className="center">Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {s.recentBills.map(bill => {
                  const balanceNum = parseFloat(bill.balance || 0);
                  return (
                    <tr key={bill.id} className="table-row-hover">
                      <td>
                        <span className="bill-tag font-mono">#{bill.bill_number}</span>
                      </td>
                      <td className="text-secondary">{formatDate(bill.bill_date)}</td>
                      <td>
                        <div className="table-party-cell">
                          <span className="party-name-bold">{bill.party_name}</span>
                          {bill.party_phone && <span className="party-phone-micro">{bill.party_phone}</span>}
                        </div>
                      </td>
                      <td className="right amount-cell font-semibold">{formatCurrency(bill.gross_total)}</td>
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
                            <Eye size={15} />
                            <span>View</span>
                          </button>
                          <button
                            className="btn-action-icon btn-action-accent"
                            onClick={() => window.open(`/bills/${bill.id}/print`, '_blank')}
                            title="Print Memo"
                          >
                            <Printer size={15} />
                            <span>Print</span>
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
    </div>
  );
}
