const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayStats, outstanding, recentBills] = await Promise.all([
      // Today's bills summary
      query(`
        SELECT
          COUNT(*) AS bill_count,
          COALESCE(SUM(gross_total), 0) AS gross_sales,
          COALESCE(SUM(paid_amount), 0) AS payments_received,
          COALESCE(SUM(commission), 0) AS commission,
          COALESCE(SUM(vehicle_rent + unloading), 0) AS other_expenses,
          COALESCE(SUM(total_expenses), 0) AS total_expenses,
          COALESCE(SUM(net_amount), 0) AS net_amount
        FROM bills
        WHERE bill_date = $1 AND status != 'VOID'
      `, [today]),

      // Total outstanding balance
      query(`
        SELECT COALESCE(SUM(current_balance), 0) AS outstanding
        FROM parties
        WHERE is_active = TRUE AND current_balance > 0
      `),

      // Recent bills (last 10)
      query(`
        SELECT b.id, b.bill_number, b.bill_date, b.gross_total, b.net_amount,
               b.paid_amount, b.balance, b.status, b.payment_method,
               p.party_name
        FROM bills b
        JOIN parties p ON b.party_id = p.id
        WHERE b.status != 'VOID'
        ORDER BY b.bill_date DESC, b.bill_number DESC
        LIMIT 10
      `)
    ]);

    const stats = todayStats.rows[0];
    res.json({
      todayBillCount: parseInt(stats.bill_count),
      todayGrossSales: parseFloat(stats.gross_sales),
      todayPaymentsReceived: parseFloat(stats.payments_received),
      todayCommission: parseFloat(stats.commission),
      todayExpenses: parseFloat(stats.total_expenses),
      todayNetAmount: parseFloat(stats.net_amount),
      totalOutstanding: parseFloat(outstanding.rows[0].outstanding),
      recentBills: recentBills.rows
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// GET /api/dashboard/chart - Monthly trend data
router.get('/chart', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        TO_CHAR(bill_date, 'Mon') AS month,
        TO_CHAR(bill_date, 'YYYY-MM') AS month_key,
        SUM(gross_total) AS gross_sales,
        SUM(net_amount) AS net_amount,
        SUM(commission) AS commission,
        COUNT(*) AS bill_count
      FROM bills
      WHERE bill_date >= CURRENT_DATE - INTERVAL '6 months'
        AND status != 'VOID'
      GROUP BY TO_CHAR(bill_date, 'YYYY-MM'), TO_CHAR(bill_date, 'Mon')
      ORDER BY month_key
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load chart data' });
  }
});

module.exports = router;
