const express = require('express');
const { query } = require('../db');
const { authenticate, requireAdmin, auditLog } = require('../middleware/auth');

const router = express.Router();

// GET /api/items - List fish items
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, active } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let pIdx = 1;

    if (active === 'true') { conditions.push('is_active = TRUE'); }
    if (search) {
      conditions.push(`(name ILIKE $${pIdx} OR item_code ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const result = await query(
      `SELECT * FROM fish_items WHERE ${conditions.join(' AND ')} ORDER BY name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load items' });
  }
});

// POST /api/items - Create item
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, itemCode, defaultRate, unit } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Item name is required' });

    const result = await query(`
      INSERT INTO fish_items (name, item_code, default_rate, unit)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [name.trim().toUpperCase(), itemCode || null, defaultRate || null, unit || 'Box']);

    await auditLog(req.user.id, 'CREATE', 'fish_item', result.rows[0].id, null, result.rows[0], `Created item ${name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Item code already exists' });
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/items/:id - Update item
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, itemCode, defaultRate, unit, isActive } = req.body;
    const result = await query(`
      UPDATE fish_items SET name=$1, item_code=$2, default_rate=$3, unit=$4, is_active=$5
      WHERE id=$6 RETURNING *
    `, [name?.trim().toUpperCase() || null, itemCode || null, defaultRate || null,
        unit || 'Box', isActive !== false, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/items/:id - Soft delete
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await query('UPDATE fish_items SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Item deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate item' });
  }
});

module.exports = router;
