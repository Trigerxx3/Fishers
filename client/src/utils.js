// Format number as Indian currency (₹X,XX,XXX.XX)
export function formatCurrency(value) {
  const n = parseFloat(value) || 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format number without rupee sign
export function formatNumber(value, decimals = 2) {
  const n = parseFloat(value) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Format date to DD/MM/YYYY
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format date to YYYY-MM-DD (for input[type=date])
export function toInputDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

// Today's date as YYYY-MM-DD
export function today() {
  return new Date().toISOString().split('T')[0];
}

// Get status badge class
export function getStatusClass(status) {
  switch (status) {
    case 'PAID': return 'badge badge-paid';
    case 'PARTIAL': return 'badge badge-partial';
    case 'DUE': return 'badge badge-due';
    case 'VOID': return 'badge badge-void';
    default: return 'badge';
  }
}

// Format status label
export function getStatusLabel(status) {
  switch (status) {
    case 'PAID': return 'Paid';
    case 'PARTIAL': return 'Partial';
    case 'DUE': return 'Due';
    case 'VOID': return 'Void';
    default: return status;
  }
}

// Compute all bill financials (mirrors backend)
export function computeBillFinancials(items, commission, vehicleRent, unloading, oldBalance, paidAmount) {
  let grossTotal = 0;
  const processedItems = items.map(item => {
    const box = parseFloat(item.box) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const total = box * rate;
    grossTotal += total;
    return { ...item, box, quantity, rate, total };
  });

  const commissionAmt = parseFloat(commission) || 0;
  const vehicleRentAmt = parseFloat(vehicleRent) || 0;
  const unloadingAmt = parseFloat(unloading) || 0;
  const oldBalanceAmt = parseFloat(oldBalance) || 0;
  const paidAmt = parseFloat(paidAmount) || 0;

  const totalExpenses = commissionAmt + vehicleRentAmt + unloadingAmt;
  const netAmount = grossTotal - totalExpenses;
  const totalDue = netAmount + oldBalanceAmt;
  const balance = totalDue - paidAmt;

  let status = 'DUE';
  if (balance <= 0) status = 'PAID';
  else if (paidAmt > 0) status = 'PARTIAL';

  return {
    items: processedItems,
    grossTotal: +grossTotal.toFixed(2),
    commission: commissionAmt,
    vehicleRent: vehicleRentAmt,
    unloading: unloadingAmt,
    totalExpenses: +totalExpenses.toFixed(2),
    netAmount: +netAmount.toFixed(2),
    oldBalance: oldBalanceAmt,
    totalDue: +totalDue.toFixed(2),
    paidAmount: paidAmt,
    balance: +balance.toFixed(2),
    status
  };
}
