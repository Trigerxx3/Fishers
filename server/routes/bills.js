const express = require('express');
const { query, withTransaction } = require('../db');
const { authenticate, requireAdmin, auditLog } = require('../middleware/auth');
const { computeBillFinancials } = require('../utils/calculations');

const router = express.Router();

// Helper: get next bill number
const getNextBillNumber = async (client) => {
  const result = await client.query(
    'UPDATE business_settings SET current_bill_number = current_bill_number + 1 WHERE id = 1 RETURNING current_bill_number'
  );
  return result.rows[0].current_bill_number;
};

// GET /api/bills - List bills with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, dateFrom, dateTo, party, status, page = 1, limit = 25 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["b.status != 'VOID' OR $1 = 'VOID'"];
    const params = [status || ''];
    let paramIdx = 2;

    const whereConditions = ['1=1'];
    const whereParams = [];
    let wIdx = 1;

    if (status) {
      whereConditions.push(`b.status = $${wIdx++}`);
      whereParams.push(status);
    }
    if (dateFrom) {
      whereConditions.push(`b.bill_date >= $${wIdx++}`);
      whereParams.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push(`b.bill_date <= $${wIdx++}`);
      whereParams.push(dateTo);
    }
    if (party) {
      whereConditions.push(`b.party_id = $${wIdx++}`);
      whereParams.push(parseInt(party));
    }
    if (search) {
      whereConditions.push(`(
        b.bill_number::text ILIKE $${wIdx} OR
        p.party_name ILIKE $${wIdx} OR
        p.phone ILIKE $${wIdx}
      )`);
      whereParams.push(`%${search}%`);
      wIdx++;
    }

    const whereClause = whereConditions.join(' AND ');
    whereParams.push(parseInt(limit), offset);
    const limitIdx = wIdx++;
    const offsetIdx = wIdx++;

    const dataQuery = `
      SELECT b.id, b.bill_number, b.invoice_number, b.bill_date,
             b.gross_total, b.total_expenses, b.net_amount,
             b.old_balance, b.total_due, b.paid_amount, b.balance,
             b.payment_method, b.status, b.created_at,
             p.party_name, p.id AS party_id,
             u.full_name AS created_by_name
      FROM bills b
      JOIN parties p ON b.party_id = p.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE ${whereClause}
      ORDER BY b.bill_date DESC, b.bill_number DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM bills b
      JOIN parties p ON b.party_id = p.id
      WHERE ${whereClause}
    `;

    const [data, count] = await Promise.all([
      query(dataQuery, whereParams),
      query(countQuery, whereParams.slice(0, -2))
    ]);

    res.json({
      bills: data.rows,
      total: parseInt(count.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Bills list error:', err);
    res.status(500).json({ error: 'Failed to load bills' });
  }
});

// GET /api/bills/:id - Get full bill with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const billResult = await query(`
      SELECT b.*, p.party_name, p.phone AS party_phone, p.address AS party_address,
             p.gst_number AS party_gst, u.full_name AS created_by_name
      FROM bills b
      JOIN parties p ON b.party_id = p.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1
    `, [req.params.id]);

    if (billResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const itemsResult = await query(
      'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY sort_order, id',
      [req.params.id]
    );

    const settingsResult = await query('SELECT * FROM business_settings WHERE id = 1');

    res.json({
      bill: billResult.rows[0],
      items: itemsResult.rows,
      settings: settingsResult.rows[0]
    });
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ error: 'Failed to load bill' });
  }
});

// POST /api/bills - Create new bill
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      partyId, billDate, items, commission, vehicleRent, unloading,
      oldBalance, paidAmount, paymentMethod, notes
    } = req.body;

    if (!partyId) return res.status(400).json({ error: 'Please select a party' });

    // Validate and compute financials on backend
    const financials = computeBillFinancials(
      items, commission, vehicleRent, unloading, oldBalance, paidAmount
    );

    const result = await withTransaction(async (client) => {
      // Get party's current balance
      const partyResult = await client.query(
        'SELECT id, party_name, current_balance FROM parties WHERE id = $1 AND is_active = TRUE',
        [partyId]
      );
      if (partyResult.rows.length === 0) {
        throw new Error('Party not found');
      }

      // Get next bill number
      const billNumber = await getNextBillNumber(client);

      // Get invoice prefix
      const settingsResult = await client.query('SELECT invoice_prefix FROM business_settings WHERE id = 1');
      const invoicePrefix = settingsResult.rows[0]?.invoice_prefix || 'INV';
      const invoiceNumber = `${invoicePrefix}${billNumber}`;

      const billDate_ = billDate || new Date().toISOString().split('T')[0];

      // Create bill
      const billResult = await client.query(`
        INSERT INTO bills (
          bill_number, invoice_number, party_id, bill_date,
          gross_total, commission, vehicle_rent, unloading, total_expenses,
          net_amount, old_balance, total_due, paid_amount, balance,
          payment_method, status, notes, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING id, bill_number, invoice_number
      `, [
        billNumber, invoiceNumber, partyId, billDate_,
        financials.grossTotal, financials.commission, financials.vehicleRent,
        financials.unloading, financials.totalExpenses, financials.netAmount,
        financials.oldBalance, financials.totalDue, financials.paidAmount,
        financials.balance, paymentMethod || 'Cash', financials.status,
        notes || null, req.user.id
      ]);

      const bill = billResult.rows[0];

      // Insert bill items
      for (let i = 0; i < financials.items.length; i++) {
        const item = financials.items[i];
        await client.query(`
          INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [bill.id, item.fishItemId || null, item.item_name, item.box, item.quantity, item.rate, item.total, i + 1]);
      }

      // Create ledger debit entry (Total Due)
      await client.query(`
        INSERT INTO ledger_entries (party_id, bill_id, entry_type, debit, credit, running_balance, description, entry_date, created_by)
        VALUES ($1, $2, 'BILL', $3, 0, $4, $5, $6, $7)
      `, [partyId, bill.id, financials.totalDue, financials.totalDue,
          `Bill #${billNumber}`, billDate_, req.user.id]);

      // If paid amount > 0, create payment and credit entry
      if (financials.paidAmount > 0) {
        const payResult = await client.query(`
          INSERT INTO payments (payment_code, party_id, bill_id, amount, payment_method, payment_date, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [`PAY-${billNumber}-1`, partyId, bill.id, financials.paidAmount,
            paymentMethod || 'Cash', billDate_, req.user.id]);

        await client.query(`
          INSERT INTO ledger_entries (party_id, bill_id, payment_id, entry_type, debit, credit, running_balance, description, entry_date, created_by)
          VALUES ($1, $2, $3, 'PAYMENT', 0, $4, $5, $6, $7, $8)
        `, [partyId, bill.id, payResult.rows[0].id, financials.paidAmount,
            financials.balance, `Payment - ${paymentMethod || 'Cash'}`, billDate_, req.user.id]);
      }

      // Update party current balance
      await client.query(
        'UPDATE parties SET current_balance = current_balance + $1 WHERE id = $2',
        [financials.balance, partyId]
      );

      return bill;
    });

    // Audit log
    await auditLog(req.user.id, 'CREATE', 'bill', result.id, null,
      { billNumber: result.bill_number }, `Created bill #${result.bill_number}`);

    res.status(201).json({ bill: result, message: `Bill #${result.bill_number} created successfully` });
  } catch (err) {
    console.error('Create bill error:', err);
    res.status(400).json({ error: err.message || 'Failed to create bill' });
  }
});

// PUT /api/bills/:id - Update bill (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, commission, vehicleRent, unloading, paidAmount, paymentMethod, notes, billDate } = req.body;

    const oldBillResult = await query('SELECT * FROM bills WHERE id = $1', [id]);
    if (oldBillResult.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    const oldBill = oldBillResult.rows[0];
    if (oldBill.status === 'VOID') return res.status(400).json({ error: 'Cannot edit a voided bill' });

    const financials = computeBillFinancials(
      items, commission, vehicleRent, unloading, oldBill.old_balance, paidAmount
    );

    await withTransaction(async (client) => {
      // Update bill
      await client.query(`
        UPDATE bills SET
          bill_date = $1, gross_total = $2, commission = $3, vehicle_rent = $4,
          unloading = $5, total_expenses = $6, net_amount = $7, total_due = $8,
          paid_amount = $9, balance = $10, payment_method = $11, status = $12, notes = $13
        WHERE id = $14
      `, [
        billDate || oldBill.bill_date,
        financials.grossTotal, financials.commission, financials.vehicleRent,
        financials.unloading, financials.totalExpenses, financials.netAmount,
        financials.totalDue, financials.paidAmount, financials.balance,
        paymentMethod || 'Cash', financials.status, notes || null, id
      ]);

      // Replace bill items
      await client.query('DELETE FROM bill_items WHERE bill_id = $1', [id]);
      for (let i = 0; i < financials.items.length; i++) {
        const item = financials.items[i];
        await client.query(`
          INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [id, item.fishItemId || null, item.item_name, item.box, item.quantity, item.rate, item.total, i + 1]);
      }

      // Recalculate party balance: remove old balance effect, add new
      const balanceDiff = financials.balance - parseFloat(oldBill.balance);
      await client.query(
        'UPDATE parties SET current_balance = current_balance + $1 WHERE id = $2',
        [balanceDiff, oldBill.party_id]
      );
    });

    await auditLog(req.user.id, 'UPDATE', 'bill', id, oldBill,
      { balance: financials.balance }, `Updated bill #${oldBill.bill_number}`);

    res.json({ message: `Bill #${oldBill.bill_number} updated successfully` });
  } catch (err) {
    console.error('Update bill error:', err);
    res.status(400).json({ error: err.message || 'Failed to update bill' });
  }
});

// POST /api/bills/:id/void - Void a bill (Admin only)
router.post('/:id/void', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'A reason is required to void a bill' });
    }

    const billResult = await query('SELECT * FROM bills WHERE id = $1', [id]);
    if (billResult.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    const bill = billResult.rows[0];
    if (bill.status === 'VOID') return res.status(400).json({ error: 'Bill is already voided' });

    await withTransaction(async (client) => {
      await client.query(
        "UPDATE bills SET status = 'VOID', void_reason = $1 WHERE id = $2",
        [reason, id]
      );

      // Reverse party balance
      await client.query(
        'UPDATE parties SET current_balance = current_balance - $1 WHERE id = $2',
        [bill.balance, bill.party_id]
      );

      // Void ledger entry
      await client.query(`
        INSERT INTO ledger_entries (party_id, bill_id, entry_type, debit, credit, running_balance, description, entry_date, created_by)
        SELECT party_id, $1, 'VOID', 0, balance, current_balance, $2, CURRENT_DATE, $3
        FROM bills b JOIN parties p ON b.party_id = p.id
        WHERE b.id = $1
      `, [id, `VOID: Bill #${bill.bill_number} - ${reason}`, req.user.id]);
    });

    await auditLog(req.user.id, 'VOID', 'bill', id, { status: bill.status },
      { status: 'VOID', reason }, `Voided bill #${bill.bill_number}: ${reason}`);

    res.json({ message: `Bill #${bill.bill_number} voided successfully` });
  } catch (err) {
    console.error('Void bill error:', err);
    res.status(500).json({ error: 'Failed to void bill' });
  }
});

module.exports = router;
