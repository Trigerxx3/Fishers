const express = require('express');
const { query, withTransaction } = require('../db');
const { authenticate, requireAdmin, auditLog } = require('../middleware/auth');

const router = express.Router();

// GET /api/parties - List with search
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['p.is_active = TRUE'];
    const params = [];
    let pIdx = 1;

    if (search) {
      conditions.push(`(p.party_name ILIKE $${pIdx} OR p.phone ILIKE $${pIdx} OR p.party_code ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    params.push(parseInt(limit), offset);

    const result = await query(`
      SELECT p.*,
        (SELECT MAX(b.bill_date) FROM bills b WHERE b.party_id = p.id AND b.status != 'VOID') AS last_transaction,
        (SELECT COUNT(*) FROM bills b WHERE b.party_id = p.id AND b.status != 'VOID') AS bill_count
      FROM parties p
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.party_name
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `, params);

    const countResult = await query(
      `SELECT COUNT(*) FROM parties p WHERE ${conditions.join(' AND ')}`,
      params.slice(0, -2)
    );

    res.json({ parties: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Parties list error:', err);
    res.status(500).json({ error: 'Failed to load parties' });
  }
});

// GET /api/parties/:id - Get party details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const partyResult = await query('SELECT * FROM parties WHERE id = $1', [req.params.id]);
    if (partyResult.rows.length === 0) return res.status(404).json({ error: 'Party not found' });

    const billsResult = await query(`
      SELECT id, bill_number, bill_date, gross_total, net_amount, paid_amount, balance, status
      FROM bills WHERE party_id = $1 AND status != 'VOID'
      ORDER BY bill_date DESC, bill_number DESC
      LIMIT 20
    `, [req.params.id]);

    const statsResult = await query(`
      SELECT
        COUNT(*) AS total_bills,
        COALESCE(SUM(gross_total), 0) AS total_billed,
        COALESCE(SUM(paid_amount), 0) AS total_paid
      FROM bills WHERE party_id = $1 AND status != 'VOID'
    `, [req.params.id]);

    res.json({
      party: partyResult.rows[0],
      bills: billsResult.rows,
      stats: statsResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load party' });
  }
});

// GET /api/parties/:id/ledger - Party ledger
router.get('/:id/ledger', authenticate, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const conditions = ['le.party_id = $1'];
    const params = [req.params.id];
    let pIdx = 2;

    if (dateFrom) { conditions.push(`le.entry_date >= $${pIdx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`le.entry_date <= $${pIdx++}`); params.push(dateTo); }

    const ledgerResult = await query(`
      SELECT le.*, b.bill_number, pay.payment_code
      FROM ledger_entries le
      LEFT JOIN bills b ON le.bill_id = b.id
      LEFT JOIN payments pay ON le.payment_id = pay.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY le.entry_date ASC, le.created_at ASC
    `, params);

    const partyResult = await query('SELECT * FROM parties WHERE id = $1', [req.params.id]);

    res.json({ ledger: ledgerResult.rows, party: partyResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load ledger' });
  }
});

// POST /api/parties - Create party
router.post('/', authenticate, async (req, res) => {
  try {
    const { partyName, partyCode, phone, address, gstNumber, openingBalance, notes } = req.body;
    if (!partyName || partyName.trim() === '') {
      return res.status(400).json({ error: 'Party name is required' });
    }

    const openBal = parseFloat(openingBalance) || 0;

    const result = await withTransaction(async (client) => {
      const party = await client.query(`
        INSERT INTO parties (party_code, party_name, phone, address, gst_number, opening_balance, current_balance, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7)
        RETURNING *
      `, [partyCode || null, partyName.trim(), phone || null, address || null,
          gstNumber || null, openBal, notes || null]);

      if (openBal > 0) {
        await client.query(`
          INSERT INTO ledger_entries (party_id, entry_type, debit, credit, running_balance, description, entry_date)
          VALUES ($1, 'OPENING', $2, 0, $2, 'Opening Balance', CURRENT_DATE)
        `, [party.rows[0].id, openBal]);
      }
      return party.rows[0];
    });

    await auditLog(req.user.id, 'CREATE', 'party', result.id, null, result, `Created party ${result.party_name}`);
    res.status(201).json(result);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Party code already exists' });
    console.error('Create party error:', err);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// PUT /api/parties/:id - Update party
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { partyName, partyCode, phone, address, gstNumber, notes, isActive } = req.body;
    const result = await query(`
      UPDATE parties SET party_name=$1, party_code=$2, phone=$3, address=$4,
        gst_number=$5, notes=$6, is_active=$7
      WHERE id=$8 RETURNING *
    `, [partyName, partyCode || null, phone || null, address || null,
        gstNumber || null, notes || null, isActive !== false, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Party not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update party' });
  }
});

// POST /api/parties/:id/adjust - Manual balance adjustment (Admin)
router.post('/:id/adjust', authenticate, requireAdmin, async (req, res) => {
  try {
    const { amount, type, reason } = req.body;
    if (!amount || !reason) return res.status(400).json({ error: 'Amount and reason are required' });
    if (!['DEBIT', 'CREDIT'].includes(type)) return res.status(400).json({ error: 'Type must be DEBIT or CREDIT' });

    const amt = parseFloat(amount);
    if (amt <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    await withTransaction(async (client) => {
      const partyResult = await client.query('SELECT * FROM parties WHERE id = $1', [req.params.id]);
      if (partyResult.rows.length === 0) throw new Error('Party not found');
      const party = partyResult.rows[0];

      const debit = type === 'DEBIT' ? amt : 0;
      const credit = type === 'CREDIT' ? amt : 0;
      const newBalance = parseFloat(party.current_balance) + debit - credit;

      await client.query(
        'UPDATE parties SET current_balance = $1 WHERE id = $2',
        [newBalance, req.params.id]
      );

      await client.query(`
        INSERT INTO ledger_entries (party_id, entry_type, debit, credit, running_balance, description, entry_date, created_by)
        VALUES ($1, 'ADJUSTMENT', $2, $3, $4, $5, CURRENT_DATE, $6)
      `, [req.params.id, debit, credit, newBalance, `Adjustment: ${reason}`, req.user.id]);
    });

    await auditLog(req.user.id, 'ADJUST', 'party', req.params.id, null,
      { amount, type, reason }, `Balance adjustment: ${type} ₹${amount} - ${reason}`);

    res.json({ message: 'Balance adjusted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to adjust balance' });
  }
});

// DELETE /api/parties/:id - Completely remove a party and its history (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const partyId = req.params.id;
    await withTransaction(async (client) => {
      const party = await client.query('SELECT party_name FROM parties WHERE id = $1', [partyId]);
      if (party.rows.length === 0) return res.status(404).json({ error: 'Party not found' });
      
      // Delete all related records
      await client.query('DELETE FROM bill_items WHERE bill_id IN (SELECT id FROM bills WHERE party_id = $1)', [partyId]);
      await client.query('DELETE FROM ledger_entries WHERE party_id = $1', [partyId]);
      await client.query('DELETE FROM payments WHERE party_id = $1', [partyId]);
      await client.query('DELETE FROM bills WHERE party_id = $1', [partyId]);
      await client.query('DELETE FROM parties WHERE id = $1', [partyId]);

      await auditLog(req.user.id, 'DELETE', 'party', partyId, party.rows[0], null, `Deleted party ${party.rows[0].party_name} and all associated records`);
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete party error:', err);
    res.status(500).json({ error: 'Failed to delete party' });
  }
});

module.exports = router;
