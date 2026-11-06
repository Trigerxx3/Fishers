import { useState, useEffect } from 'react';
import api from '../api';
import { formatCurrency, formatDate, today } from '../utils';
import toast from 'react-hot-toast';

const REPORTS = [
  { key: 'daily', label: 'Daily Report' },
  { key: 'monthly', label: 'Monthly Report' },
  { key: 'outstanding', label: 'Outstanding Balances' },
  { key: 'commission', label: 'Commission & Expenses' },
  { key: 'party-wise', label: 'Party-wise Sales' },
  { key: 'fish-wise', label: 'Fish-wise Sales' },
];

function DailyReport() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/daily?date=${date}`);
      setData(res.data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [date]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Bill No', 'Party', 'Gross Total', 'Net Amount', 'Paid', 'Balance', 'Status'],
      ...data.bills.map(b => [b.bill_number, b.party_name, b.gross_total, b.net_amount, b.paid_amount, b.balance, b.status])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `daily-report-${date}.csv`; a.click();
  };

  return (
    <div>
      <div className="flex gap-8 items-center" style={{ marginBottom: 16 }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Date:</label>
        <input className="form-control" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto' }} />
        <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print</button>
        <button className="btn btn-secondary btn-sm no-print" onClick={exportCSV}>Export CSV</button>
      </div>

      {loading && <div className="loading-state"><div className="spinner" /></div>}
      {data && (
        <>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>DAILY REPORT — {formatDate(date)}</h3>
            <div className="report-summary-grid">
              {[
                { label: 'Total Bills', value: data.summary.bill_count, unit: '' },
                { label: 'Gross Sales', value: formatCurrency(data.summary.gross_sales), unit: '' },
                { label: 'Commission', value: formatCurrency(data.summary.commission), unit: '' },
                { label: 'Vehicle Rent', value: formatCurrency(data.summary.vehicle_rent), unit: '' },
                { label: 'Unloading', value: formatCurrency(data.summary.unloading), unit: '' },
                { label: 'Total Expenses', value: formatCurrency(data.summary.total_expenses), unit: '' },
                { label: 'Net Amount', value: formatCurrency(data.summary.net_amount), unit: '' },
                { label: 'Payments Received', value: formatCurrency(data.summary.payments_received), unit: '' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ padding: 12 }}>
                  <div className="stat-label">{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {data.bills.length > 0 && (
            <div className="table-container" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Party</th>
                    <th className="right">Gross Total</th>
                    <th className="right">Net Amount</th>
                    <th className="right">Paid</th>
                    <th className="right">Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bills.map(b => (
                    <tr key={b.bill_number}>
                      <td><strong>{b.bill_number}</strong></td>
                      <td>{b.party_name}</td>
                      <td className="right amount-cell">{formatCurrency(b.gross_total)}</td>
                      <td className="right amount-cell">{formatCurrency(b.net_amount)}</td>
                      <td className="right amount-cell">{formatCurrency(b.paid_amount)}</td>
                      <td className="right amount-cell">{formatCurrency(b.balance)}</td>
                      <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Total Outstanding: <strong>{formatCurrency(data.outstanding)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/monthly?year=${year}&month=${month}`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [year, month]);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div>
      <div className="flex gap-8 items-center" style={{ marginBottom: 16 }}>
        <select className="form-control" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)}>
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-control" style={{ width: 'auto' }} value={year} onChange={e => setYear(e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print</button>
      </div>

      {loading && <div className="loading-state"><div className="spinner" /></div>}
      {data && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            MONTHLY REPORT — {months[month - 1]} {year}
          </h3>
          <div className="report-summary-grid">
            {[
              { label: 'Total Bills', value: data.summary.bill_count },
              { label: 'Gross Sales', value: formatCurrency(data.summary.gross_sales) },
              { label: 'Net Amount', value: formatCurrency(data.summary.net_amount) },
              { label: 'Commission', value: formatCurrency(data.summary.commission) },
              { label: 'Vehicle Rent', value: formatCurrency(data.summary.vehicle_rent) },
              { label: 'Total Expenses', value: formatCurrency(data.summary.total_expenses) },
              { label: 'Payments Received', value: formatCurrency(data.summary.payments_received) },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding: 12 }}>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {data.partyBreakdown.length > 0 && (
            <>
              <div className="section-title" style={{ marginBottom: 8 }}>Party-wise Breakdown</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Party</th>
                      <th className="right">Bills</th>
                      <th className="right">Gross Sales</th>
                      <th className="right">Paid</th>
                      <th className="right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.partyBreakdown.map((p, i) => (
                      <tr key={i}>
                        <td>{p.party_name}</td>
                        <td className="right">{p.bill_count}</td>
                        <td className="right amount-cell">{formatCurrency(p.gross_sales)}</td>
                        <td className="right amount-cell">{formatCurrency(p.paid)}</td>
                        <td className="right amount-cell">{formatCurrency(p.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function OutstandingReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/outstanding').then(res => setData(res.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex gap-8 items-center justify-between" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Outstanding Balances</h3>
        <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print</button>
      </div>
      {loading && <div className="loading-state"><div className="spinner" /></div>}
      {data && (
        <>
          <div className="alert alert-warning" style={{ marginBottom: 12 }}>
            Total Outstanding: <strong>{formatCurrency(data.total)}</strong>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Party Name</th>
                  <th>Phone</th>
                  <th className="right">Outstanding Balance</th>
                  <th>Last Bill Date</th>
                </tr>
              </thead>
              <tbody>
                {data.parties.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td><strong>{p.party_name}</strong></td>
                    <td>{p.phone || '—'}</td>
                    <td className="right amount-cell balance-positive">{formatCurrency(p.current_balance)}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{p.last_bill_date ? formatDate(p.last_bill_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CommissionReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    api.get(`/reports/commission?${params}`).then(res => setData(res.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  return (
    <div>
      <div className="flex gap-8 items-center" style={{ marginBottom: 16 }}>
        <label className="form-label" style={{ marginBottom: 0 }}>From:</label>
        <input className="form-control" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
        <label className="form-label" style={{ marginBottom: 0 }}>To:</label>
        <input className="form-control" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 'auto' }} />
        <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print</button>
      </div>
      {loading && <div className="loading-state"><div className="spinner" /></div>}
      {data && (
        <>
          <div className="report-summary-grid">
            {[
              { label: 'Commission', value: formatCurrency(data.summary.total_commission) },
              { label: 'Vehicle Rent', value: formatCurrency(data.summary.total_vehicle_rent) },
              { label: 'Unloading', value: formatCurrency(data.summary.total_unloading) },
              { label: 'Total Expenses', value: formatCurrency(data.summary.total_expenses) },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding: 12 }}>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="right">Gross Sales</th>
                  <th className="right">Commission</th>
                  <th className="right">Vehicle Rent</th>
                  <th className="right">Unloading</th>
                  <th className="right">Total Expenses</th>
                </tr>
              </thead>
              <tbody>
                {data.byDate.map((d, i) => (
                  <tr key={i}>
                    <td>{formatDate(d.bill_date)}</td>
                    <td className="right amount-cell">{formatCurrency(d.gross_sales)}</td>
                    <td className="right amount-cell">{formatCurrency(d.commission)}</td>
                    <td className="right amount-cell">{formatCurrency(d.vehicle_rent)}</td>
                    <td className="right amount-cell">{formatCurrency(d.unloading)}</td>
                    <td className="right amount-cell">{formatCurrency(d.total_expenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PartyWiseReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    api.get(`/reports/party-wise?${params}`).then(res => setData(res.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  return (
    <div>
      <div className="flex gap-8 items-center" style={{ marginBottom: 16 }}>
        <label className="form-label" style={{ marginBottom: 0 }}>From:</label>
        <input className="form-control" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
        <label className="form-label" style={{ marginBottom: 0 }}>To:</label>
        <input className="form-control" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 'auto' }} />
        <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print</button>
      </div>
      {loading && <div className="loading-state"><div className="spinner" /></div>}
      {data && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Party</th>
                <th className="right">Bills</th>
                <th className="right">Gross Sales</th>
                <th className="right">Commission</th>
                <th className="right">Net Amount</th>
                <th className="right">Paid</th>
                <th className="right">Pending</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i}>
                  <td><strong>{p.party_name}</strong><br/><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.phone}</span></td>
                  <td className="right">{p.bill_count}</td>
                  <td className="right amount-cell">{formatCurrency(p.gross_sales)}</td>
                  <td className="right amount-cell">{formatCurrency(p.commission)}</td>
                  <td className="right amount-cell">{formatCurrency(p.net_amount)}</td>
                  <td className="right amount-cell" style={{ color: 'var(--color-success)' }}>{formatCurrency(p.paid)}</td>
                  <td className="right amount-cell" style={{ color: parseFloat(p.pending_balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {formatCurrency(p.pending_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FishWiseReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    api.get(`/reports/fish-wise?${params}`).then(res => setData(res.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  return (
    <div>
      <div className="flex gap-8 items-center" style={{ marginBottom: 16 }}>
        <label className="form-label" style={{ marginBottom: 0 }}>From:</label>
        <input className="form-control" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
        <label className="form-label" style={{ marginBottom: 0 }}>To:</label>
        <input className="form-control" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 'auto' }} />
        <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print</button>
      </div>
      {loading && <div className="loading-state"><div className="spinner" /></div>}
      {data && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fish Name</th>
                <th className="right">Bills</th>
                <th className="right">Total Boxes</th>
                <th className="right">Avg Rate (₹)</th>
                <th className="right">Total Sales (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((f, i) => (
                <tr key={i}>
                  <td><strong>{f.item_name}</strong></td>
                  <td className="right">{f.bill_count}</td>
                  <td className="right amount-cell">{parseFloat(f.total_boxes).toLocaleString('en-IN')}</td>
                  <td className="right amount-cell">{formatCurrency(f.avg_rate)}</td>
                  <td className="right amount-cell">{formatCurrency(f.total_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState('daily');

  const reportComponents = {
    daily: DailyReport,
    monthly: MonthlyReport,
    outstanding: OutstandingReport,
    commission: CommissionReport,
    'party-wise': PartyWiseReport,
    'fish-wise': FishWiseReport,
  };

  const ActiveReport = reportComponents[activeReport];

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <div className="page-title">Reports</div>
      </div>

      {/* Report type tabs */}
      <div className="card no-print" style={{ marginBottom: 16, padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2, scrollbarWidth: 'none' }}>
          {REPORTS.map(r => (
            <button key={r.key}
              onClick={() => setActiveReport(r.key)}
              className={`btn ${activeReport === r.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{ flexShrink: 0 }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <ActiveReport />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sidebar { display: none; }
        }
      `}</style>
    </div>
  );
}
