import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { formatCurrency, formatDate } from '../utils';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, Download, RotateCcw, FileText } from 'lucide-react';

export default function PartyLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await api.get(`/parties/${id}/ledger?${params}`);
      setParty(res.data.party);
      setLedger(res.data.ledger);
    } catch {
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dateFrom, dateTo]);

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    const rows = [
      ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
      ...ledger.map(e => [
        formatDate(e.entry_date),
        e.description,
        e.debit || '',
        e.credit || '',
        e.running_balance
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${party?.party_name?.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Ledger exported as CSV');
  };

  const currentBal = parseFloat(party?.current_balance || 0);

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <div>
          <div className="page-title">Ledger Statement — {party?.party_name}</div>
          <div className="page-subtitle" style={{ color: currentBal > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
            Current Balance: {formatCurrency(party?.current_balance)}
          </div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary btn-icon-text" onClick={() => navigate(`/parties/${id}`)}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <button className="btn btn-secondary btn-icon-text" onClick={exportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button className="btn btn-primary btn-icon-text" onClick={handlePrint}>
            <Printer size={14} />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar no-print">
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>From:</label>
        <input
          className="form-control"
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
        />
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>To:</label>
        <input
          className="form-control"
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
        />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setDateFrom(''); setDateTo(''); }}
          title="Reset date filter"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      {/* Print header */}
      <div className="print-only" style={{ display: 'none', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Party Account Statement</h1>
        <div><strong>Party:</strong> {party?.party_name}</div>
        <div><strong>Phone:</strong> {party?.phone}</div>
        {dateFrom && <div><strong>From:</strong> {formatDate(dateFrom)}</div>}
        {dateTo && <div><strong>To:</strong> {formatDate(dateTo)}</div>}
        <div style={{ marginTop: 8 }}><strong>Current Balance:</strong> {formatCurrency(party?.current_balance)}</div>
      </div>

      <div className="card card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading statement entries...</span>
          </div>
        ) : ledger.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={36} strokeWidth={1.5} />
            </div>
            <h3>No Transactions Recorded</h3>
            <p>No billing or payment activity found for this period.</p>
          </div>
        ) : (
          <div className="table-container table-flush">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description / Voucher</th>
                  <th className="right">Debit (Dr - Bill)</th>
                  <th className="right">Credit (Cr - Paid)</th>
                  <th className="right">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry, i) => (
                  <tr key={i} className="table-row-hover">
                    <td className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(entry.entry_date)}
                    </td>
                    <td>
                      <span className="party-name-bold">{entry.description}</span>
                      {entry.bill_number && (
                        <span className="bill-tag font-mono" style={{ marginLeft: 6, fontSize: 11 }}>
                          #{entry.bill_number}
                        </span>
                      )}
                    </td>
                    <td className="right amount-cell" style={{ color: parseFloat(entry.debit) > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {parseFloat(entry.debit) > 0 ? formatCurrency(entry.debit) : '—'}
                    </td>
                    <td className="right amount-cell" style={{ color: parseFloat(entry.credit) > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                      {parseFloat(entry.credit) > 0 ? formatCurrency(entry.credit) : '—'}
                    </td>
                    <td className="right amount-cell font-semibold" style={{ color: parseFloat(entry.running_balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {formatCurrency(entry.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--color-surface-hover)' }}>
                  <td colSpan="4" style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right', borderTop: '2px solid var(--color-border)' }}>
                    Closing Outstanding Balance
                  </td>
                  <td
                    className="right amount-cell"
                    style={{
                      padding: '12px 16px', fontWeight: 800, fontSize: 15,
                      borderTop: '2px solid var(--color-border)',
                      color: currentBal > 0 ? 'var(--color-danger)' : 'var(--color-success)'
                    }}
                  >
                    {formatCurrency(party?.current_balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .sidebar, .filters-bar, .app-topbar, .mobile-bottom-bar { display: none !important; }
          .card { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
