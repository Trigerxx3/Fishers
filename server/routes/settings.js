const express = require('express');
const { query } = require('../db');
const { authenticate, requireAdmin, auditLog } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM business_settings WHERE id = 1');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/settings - Admin only
router.put('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      businessName, address, city, state, phone, email, gstNumber,
      footerText, startingBillNumber, currentBillNumber, billPrefix,
      invoicePrefix, defaultPaymentMethod
    } = req.body;

    const result = await query(`
      UPDATE business_settings SET
        business_name=$1, address=$2, city=$3, state=$4, phone=$5, email=$6,
        gst_number=$7, footer_text=$8,
        starting_bill_number=COALESCE($9, starting_bill_number),
        current_bill_number=COALESCE($10, current_bill_number),
        bill_prefix=COALESCE($11, bill_prefix),
        invoice_prefix=COALESCE($12, invoice_prefix),
        default_payment_method=COALESCE($13, default_payment_method)
      WHERE id=1 RETURNING *
    `, [
      businessName, address, city, state, phone, email, gstNumber,
      footerText, startingBillNumber, currentBillNumber, billPrefix,
      invoicePrefix, defaultPaymentMethod
    ]);

    await auditLog(req.user.id, 'UPDATE', 'settings', 1, null, result.rows[0], 'Updated business settings');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
