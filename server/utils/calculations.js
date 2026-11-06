/**
 * Format a number as Indian currency string
 * Example: 68400 -> "68,400.00"
 */
const formatCurrency = (num) => {
  const n = parseFloat(num) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Calculate bill status based on paid amount and balance
 */
const calculateStatus = (paidAmount, balance) => {
  const paid = parseFloat(paidAmount) || 0;
  const bal = parseFloat(balance) || 0;
  if (bal <= 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'DUE';
};

/**
 * Validate and compute all bill financials
 * Throws if any input is invalid
 */
const computeBillFinancials = (items, commission, vehicleRent, unloading, oldBalance, paidAmount) => {
  // Validate items
  if (!items || items.length === 0) {
    throw new Error('At least one item is required');
  }

  let grossTotal = 0;
  const processedItems = items.map((item, idx) => {
    const box = parseFloat(item.box) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate);

    if (box < 0) throw new Error(`Item ${idx + 1}: Box count cannot be negative`);
    if (quantity < 0) throw new Error(`Item ${idx + 1}: Quantity cannot be negative`);
    if (!rate || rate <= 0) throw new Error(`Item ${idx + 1}: Rate must be greater than 0`);
    if (!item.item_name || item.item_name.trim() === '') throw new Error(`Item ${idx + 1}: Item name is required`);

    const total = box * rate;
    grossTotal += total;

    return { ...item, box, quantity, rate, total };
  });

  const commissionAmt = parseFloat(commission) || 0;
  const vehicleRentAmt = parseFloat(vehicleRent) || 0;
  const unloadingAmt = parseFloat(unloading) || 0;
  const oldBalanceAmt = parseFloat(oldBalance) || 0;
  const paidAmt = parseFloat(paidAmount) || 0;

  if (commissionAmt < 0) throw new Error('Commission cannot be negative');
  if (vehicleRentAmt < 0) throw new Error('Vehicle rent cannot be negative');
  if (unloadingAmt < 0) throw new Error('Unloading cannot be negative');
  if (paidAmt < 0) throw new Error('Paid amount cannot be negative');

  const totalExpenses = commissionAmt + vehicleRentAmt + unloadingAmt;
  const netAmount = grossTotal - totalExpenses;
  const totalDue = netAmount + oldBalanceAmt;
  const balance = totalDue - paidAmt;

  if (paidAmt > totalDue) throw new Error('Paid amount cannot be greater than total due');

  const status = calculateStatus(paidAmt, balance);

  return {
    items: processedItems,
    grossTotal: parseFloat(grossTotal.toFixed(2)),
    commission: commissionAmt,
    vehicleRent: vehicleRentAmt,
    unloading: unloadingAmt,
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2)),
    oldBalance: oldBalanceAmt,
    totalDue: parseFloat(totalDue.toFixed(2)),
    paidAmount: paidAmt,
    balance: parseFloat(balance.toFixed(2)),
    status
  };
};

module.exports = { formatCurrency, calculateStatus, computeBillFinancials };
