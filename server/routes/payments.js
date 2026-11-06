const express = require('express');
const { query, withTransaction } = require('../db');
const { authenticate, requireAdmin, auditLog } = require('../middleware/auth');

const router = express.Router();

// GET /api/payments - List payments
router.get('/', authenticate, async (req, res) => {
  try {
    const { partyId, dateFrom, dateTo, page = 1, limit = 25 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['pay.is_void = FALSE'];
    const params = [];
    let pIdx = 1;

    if (partyId) { conditions.push(`pay.party_id = $${pIdx++}`); params.push(partyId); }
    if (dateFrom) { conditions.push(`pay.payment_date >= $${pIdx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`pay.payment_date <= $${pIdx++}`); params.push(dateTo); }

    params.push(parseInt(limit), offset);

    const result = await query(`
      SELECT pay.*, p.party_name, b.bill_number, u.full_name AS created_by_name
      FROM payments pay
      JOIN parties p ON pay.party_id = p.id
      LEFT JOIN bills b ON pay.bill_id = b.id
      LEFT JOIN users u ON pay.created_by = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pay.payment_date DESC, pay.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `, params);

    const countResult = await query(
      `SELECT COUNT(*) FROM payments pay WHERE ${conditions.join(' AND ')}`,
      params.slice(0, -2)
    );

    res.json({ payments: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

// POST /api/payments - Record payment
router.post('/', authenticate, async (req, res) => {
  try {
    const { partyId, billId, amount, paymentMethod, paymentDate, notes } = req.body;
    if (!partyId) return res.status(400).json({ error: 'Please select a party' });
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const result = await withTransaction(async (client) => {
      // Verify party exists
      const partyResult = await client.query('SELECT * FROM parties WHERE id = $1', [partyId]);
      if (partyResult.rows.length === 0) throw new Error('Party not found');
      const party = partyResult.rows[0];

      // Generate payment code
      const codeResult = await client.query('SELECT COUNT(*) FROM payments');
      const payCode = `PAY-${String(parseInt(codeResult.rows[0].count) + 1).padStart(5, '0')}`;

      const payDate = paymentDate || new Date().toISOString().split('T')[0];

      const payResult = await client.query(`
        INSERT INTO payments (payment_code, party_id, bill_id, amount, payment_method, payment_date, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [payCode, partyId, billId || null, amt, paymentMethod || 'Cash', payDate, notes || null, req.user.id]);

      const payment = payResult.rows[0];
      const newBalance = parseFloat(party.current_balance) - amt;

      // Update party balance
      await client.query('UPDATE parties SET current_balance = $1 WHERE id = $2', [newBalance, partyId]);

      // If linked to a bill, update the bill's paid amount and balance
      if (billId) {
        await client.query(`
          UPDATE bills SET
            paid_amount = paid_amount + $1,
            balance = balance - $1,
            status = CASE WHEN balance - $1 <= 0 THEN 'PAID' ELSE 'PARTIAL' END
          WHERE id = $2
        `, [amt, billId]);
      }

      // Create ledger credit entry
      await client.query(`
        INSERT INTO ledger_entries (party_id, bill_id, payment_id, entry_type, debit, credit, running_balance, description, entry_date, created_by)
        VALUES ($1, $2, $3, 'PAYMENT', 0, $4, $5, $6, $7, $8)
      `, [partyId, billId || null, payment.id, amt, newBalance,
          `Payment received - ${paymentMethod || 'Cash'}${billId ? ` for Bill` : ''}`,
          payDate, req.user.id]);

      return payment;
    });

    await auditLog(req.user.id, 'CREATE', 'payment', result.id, null, result, `Payment of ₹${amt} recorded`);
    res.status(201).json({ payment: result, message: 'Payment recorded successfully' });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(400).json({ error: err.message || 'Failed to record payment' });
  }
});

// DELETE /api/payments/:id - Void payment (Admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required to void payment' });

    const payResult = await query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (payResult.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    const payment = payResult.rows[0];
    if (payment.is_void) return res.status(400).json({ error: 'Payment is already voided' });

    await withTransaction(async (client) => {
      await client.query('UPDATE payments SET is_void = TRUE, void_reason = $1 WHERE id = $2', [reason, req.params.id]);
      await client.query('UPDATE parties SET current_balance = current_balance + $1 WHERE id = $2', [payment.amount, payment.party_id]);
      if (payment.bill_id) {
        await client.query(`
          UPDATE bills SET paid_amount = paid_amount - $1, balance = balance + $1,
            status = CASE WHEN paid_amount - $1 <= 0 THEN 'DUE' WHEN paid_amount - $1 > 0 THEN 'PARTIAL' ELSE status END
          WHERE id = $2
        `, [payment.amount, payment.bill_id]);
      }
    });

    await auditLog(req.user.id, 'VOID', 'payment', req.params.id, payment, null, `Voided payment: ${reason}`);
    res.json({ message: 'Payment voided' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to void payment' });
  }
});

module.exports = router;
