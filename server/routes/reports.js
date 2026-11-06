const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', authenticate, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const [summary, billsList, paymentsList] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS bill_count,
          COALESCE(SUM(gross_total),0) AS gross_sales,
          COALESCE(SUM(commission),0) AS commission,
          COALESCE(SUM(vehicle_rent),0) AS vehicle_rent,
          COALESCE(SUM(unloading),0) AS unloading,
          COALESCE(SUM(total_expenses),0) AS total_expenses,
          COALESCE(SUM(net_amount),0) AS net_amount,
          COALESCE(SUM(paid_amount),0) AS payments_received
        FROM bills WHERE bill_date=$1 AND status != 'VOID'
      `, [date]),

      query(`
        SELECT b.bill_number, b.gross_total, b.net_amount, b.paid_amount, b.balance, b.status,
               p.party_name
        FROM bills b JOIN parties p ON b.party_id=p.id
        WHERE b.bill_date=$1 AND b.status!='VOID'
        ORDER BY b.bill_number
      `, [date]),

      query(`
        SELECT pay.payment_code, pay.amount, pay.payment_method, p.party_name, b.bill_number
        FROM payments pay
        JOIN parties p ON pay.party_id=p.id
        LEFT JOIN bills b ON pay.bill_id=b.id
        WHERE pay.payment_date=$1 AND pay.is_void=FALSE
        ORDER BY pay.created_at
      `, [date])
    ]);

    const outstanding = await query(`
      SELECT COALESCE(SUM(current_balance),0) AS total FROM parties WHERE current_balance > 0
    `);

    res.json({
      date,
      summary: summary.rows[0],
      outstanding: outstanding.rows[0].total,
      bills: billsList.rows,
      payments: paymentsList.rows
    });
  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

// GET /api/reports/monthly?year=2026&month=9
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;

    const [summary, daily, partyBreakdown] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS bill_count,
          COALESCE(SUM(gross_total),0) AS gross_sales,
          COALESCE(SUM(commission),0) AS commission,
          COALESCE(SUM(vehicle_rent),0) AS vehicle_rent,
          COALESCE(SUM(unloading),0) AS unloading,
          COALESCE(SUM(total_expenses),0) AS total_expenses,
          COALESCE(SUM(net_amount),0) AS net_amount,
          COALESCE(SUM(paid_amount),0) AS payments_received
        FROM bills
        WHERE EXTRACT(YEAR FROM bill_date)=$1 AND EXTRACT(MONTH FROM bill_date)=$2 AND status!='VOID'
      `, [year, month]),

      query(`
        SELECT
          bill_date,
          COUNT(*) AS bill_count,
          COALESCE(SUM(gross_total),0) AS gross_sales,
          COALESCE(SUM(net_amount),0) AS net_amount,
          COALESCE(SUM(paid_amount),0) AS paid_amount
        FROM bills
        WHERE EXTRACT(YEAR FROM bill_date)=$1 AND EXTRACT(MONTH FROM bill_date)=$2 AND status!='VOID'
        GROUP BY bill_date ORDER BY bill_date
      `, [year, month]),

      query(`
        SELECT p.party_name,
          COUNT(b.id) AS bill_count,
          COALESCE(SUM(b.gross_total),0) AS gross_sales,
          COALESCE(SUM(b.paid_amount),0) AS paid,
          COALESCE(SUM(b.balance),0) AS balance
        FROM bills b JOIN parties p ON b.party_id=p.id
        WHERE EXTRACT(YEAR FROM b.bill_date)=$1 AND EXTRACT(MONTH FROM b.bill_date)=$2 AND b.status!='VOID'
        GROUP BY p.id, p.party_name ORDER BY gross_sales DESC
      `, [year, month])
    ]);

    res.json({ year, month, summary: summary.rows[0], daily: daily.rows, partyBreakdown: partyBreakdown.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// GET /api/reports/outstanding
router.get('/outstanding', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.id, p.party_name, p.phone, p.current_balance,
        (SELECT MAX(b.bill_date) FROM bills b WHERE b.party_id=p.id AND b.status!='VOID') AS last_bill_date
      FROM parties p
      WHERE p.current_balance > 0 AND p.is_active=TRUE
      ORDER BY p.current_balance DESC
    `);
    const totalResult = await query(`SELECT COALESCE(SUM(current_balance),0) AS total FROM parties WHERE current_balance > 0`);
    res.json({ parties: result.rows, total: totalResult.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate outstanding report' });
  }
});

// GET /api/reports/party-wise?dateFrom=&dateTo=
router.get('/party-wise', authenticate, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const conditions = ["b.status != 'VOID'"];
    const params = [];
    let pIdx = 1;
    if (dateFrom) { conditions.push(`b.bill_date >= $${pIdx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`b.bill_date <= $${pIdx++}`); params.push(dateTo); }

    const result = await query(`
      SELECT p.party_name, p.phone,
        COUNT(b.id) AS bill_count,
        COALESCE(SUM(b.gross_total),0) AS gross_sales,
        COALESCE(SUM(b.net_amount),0) AS net_amount,
        COALESCE(SUM(b.paid_amount),0) AS paid,
        COALESCE(SUM(b.balance),0) AS pending_balance,
        COALESCE(SUM(b.commission),0) AS commission
      FROM bills b JOIN parties p ON b.party_id=p.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id, p.party_name, p.phone
      ORDER BY gross_sales DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate party-wise report' });
  }
});

// GET /api/reports/fish-wise?dateFrom=&dateTo=
router.get('/fish-wise', authenticate, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const conditions = ["b.status != 'VOID'"];
    const params = [];
    let pIdx = 1;
    if (dateFrom) { conditions.push(`b.bill_date >= $${pIdx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`b.bill_date <= $${pIdx++}`); params.push(dateTo); }

    const result = await query(`
      SELECT bi.item_name,
        COUNT(DISTINCT b.id) AS bill_count,
        SUM(bi.box) AS total_boxes,
        SUM(bi.quantity) AS total_quantity,
        COALESCE(SUM(bi.total),0) AS total_sales,
        ROUND(AVG(bi.rate),2) AS avg_rate
      FROM bill_items bi JOIN bills b ON bi.bill_id=b.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY bi.item_name
      ORDER BY total_sales DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate fish-wise report' });
  }
});

// GET /api/reports/commission?dateFrom=&dateTo=
router.get('/commission', authenticate, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const conditions = ["status != 'VOID'"];
    const params = [];
    let pIdx = 1;
    if (dateFrom) { conditions.push(`bill_date >= $${pIdx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`bill_date <= $${pIdx++}`); params.push(dateTo); }

    const result = await query(`
      SELECT
        COALESCE(SUM(commission),0) AS total_commission,
        COALESCE(SUM(vehicle_rent),0) AS total_vehicle_rent,
        COALESCE(SUM(unloading),0) AS total_unloading,
        COALESCE(SUM(total_expenses),0) AS total_expenses,
        COALESCE(SUM(gross_total),0) AS gross_sales,
        COUNT(*) AS bill_count
      FROM bills WHERE ${conditions.join(' AND ')}
    `, params);

    const byDate = await query(`
      SELECT bill_date,
        COALESCE(SUM(commission),0) AS commission,
        COALESCE(SUM(vehicle_rent),0) AS vehicle_rent,
        COALESCE(SUM(unloading),0) AS unloading,
        COALESCE(SUM(total_expenses),0) AS total_expenses,
        COALESCE(SUM(gross_total),0) AS gross_sales
      FROM bills WHERE ${conditions.join(' AND ')}
      GROUP BY bill_date ORDER BY bill_date DESC
    `, params);

    res.json({ summary: result.rows[0], byDate: byDate.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate commission report' });
  }
});

module.exports = router;
