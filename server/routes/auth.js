const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticate, requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await query(
      'SELECT id, username, password_hash, full_name, role, is_active FROM users WHERE username = $1',
      [username.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive. Contact administrator.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users - Admin only
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// POST /api/auth/users - Admin only
router.post('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['ADMIN', 'STAFF'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role',
      [username.toLowerCase().trim(), hash, fullName, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/auth/users/:id - Admin only
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { fullName, role, isActive, password } = req.body;
    const { id } = req.params;
    let updateQuery, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE users SET full_name=$1, role=$2, is_active=$3, password_hash=$4 WHERE id=$5 RETURNING id, username, full_name, role, is_active';
      params = [fullName, role, isActive, hash, id];
    } else {
      updateQuery = 'UPDATE users SET full_name=$1, role=$2, is_active=$3 WHERE id=$4 RETURNING id, username, full_name, role, is_active';
      params = [fullName, role, isActive, id];
    }
    const result = await query(updateQuery, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
