import express from 'express';
import pool from '../config/db.js';
import { verifyToken, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

// GET /api/promos
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM promos WHERE is_active = TRUE ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Fetch promos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/promos (Admin)
router.post('/', [verifyToken, isAdmin], async (req, res) => {
  const { title, code, discount_type, discount_value, min_order_price, expiry_date } = req.body;
  
  if (!title || !code || !discount_type || discount_value == null || !expiry_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO promos (title, code, discount_type, discount_value, min_order_price, expiry_date) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, code, discount_type, discount_value, min_order_price || 0, expiry_date]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Create promo error:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'Promo code already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/promos/:id (Admin)
router.put('/:id', [verifyToken, isAdmin], async (req, res) => {
  const { id } = req.params;
  const { title, code, discount_type, discount_value, min_order_price, expiry_date, is_active } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE promos SET 
        title = COALESCE($1, title),
        code = COALESCE($2, code),
        discount_type = COALESCE($3, discount_type),
        discount_value = COALESCE($4, discount_value),
        min_order_price = COALESCE($5, min_order_price),
        expiry_date = COALESCE($6, expiry_date),
        is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
      [title, code, discount_type, discount_value, min_order_price, expiry_date, is_active, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Promo not found' });
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Update promo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/promos/:id (Admin)
router.delete('/:id', [verifyToken, isAdmin], async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM promos WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Promo not found' });
    res.status(200).json({ message: 'Promo deleted successfully' });
  } catch (error) {
    console.error('Delete promo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
