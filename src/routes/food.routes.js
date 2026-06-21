import express from 'express';
import pool from '../config/db.js';
import { verifyToken, isAdmin } from '../middlewares/auth.js';
import { upload, processImage } from '../middlewares/upload.js';

const router = express.Router();

// GET /api/foods
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM foods ORDER BY category, name');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Fetch foods error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/foods (Admin)
router.post('/', [verifyToken, isAdmin, upload.single('image'), processImage], async (req, res) => {
  const { name, price, discount_price, category, description } = req.body;
  const image_url = req.file ? req.file.publicUrl : null;

  if (!name || !price || !category || !image_url) {
    return res.status(400).json({ error: 'Missing required fields (name, price, category, image)' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO foods (name, price, discount_price, category, image_url, description) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, price, discount_price || 0, category, image_url, description || '']
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Create food error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/foods/:id (Admin)
router.put('/:id', [verifyToken, isAdmin, upload.single('image'), processImage], async (req, res) => {
  const { id } = req.params;
  const { name, price, discount_price, category, description, is_available } = req.body;
  const image_url = req.file ? req.file.publicUrl : undefined;

  try {
    const { rows } = await pool.query(
      `UPDATE foods SET 
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        discount_price = COALESCE($3, discount_price),
        category = COALESCE($4, category),
        description = COALESCE($5, description),
        is_available = COALESCE($6, is_available),
        image_url = COALESCE($7, image_url)
       WHERE id = $8 RETURNING *`,
      [name, price, discount_price, category, description, is_available, image_url, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Food not found' });
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Update food error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/foods/:id (Admin)
router.delete('/:id', [verifyToken, isAdmin], async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM foods WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Food not found' });
    res.status(200).json({ message: 'Food deleted successfully' });
  } catch (error) {
    console.error('Delete food error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
