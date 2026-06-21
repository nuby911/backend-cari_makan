import express from 'express';
import pool from '../config/db.js';
import { verifyToken, isKasirOrAdmin } from '../middlewares/auth.js';

const router = express.Router();

// POST /api/orders (Public)
router.post('/', async (req, res) => {
  const { table_number, items, promo_code } = req.body;
  // items: [{ food_id: 1, qty: 2, notes: '' }]

  if (!table_number || !items || items.length === 0) {
    return res.status(400).json({ error: 'table_number and items are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Calculate subtotal
    let subtotal_price = 0;
    for (const item of items) {
      const { rows } = await client.query('SELECT price, discount_price FROM foods WHERE id = $1', [item.food_id]);
      if (rows.length === 0) throw new Error(`Food ID ${item.food_id} not found`);
      
      const food = rows[0];
      const effectivePrice = food.discount_price > 0 ? food.discount_price : food.price;
      subtotal_price += effectivePrice * item.qty;
    }

    // 2. Check Promo
    let discount_amount = 0;
    if (promo_code) {
      const { rows } = await client.query(
        'SELECT * FROM promos WHERE code = $1 AND is_active = TRUE AND expiry_date > NOW()',
        [promo_code]
      );
      if (rows.length > 0) {
        const promo = rows[0];
        if (subtotal_price >= promo.min_order_price) {
          if (promo.discount_type === 'percentage') {
            discount_amount = Math.floor(subtotal_price * (promo.discount_value / 100));
          } else {
            discount_amount = promo.discount_value;
          }
        }
      }
    }

    const total_price = Math.max(0, subtotal_price - discount_amount);
    const transaction_id = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 3. Create Order
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (table_number, subtotal_price, discount_amount, total_price, transaction_id, promo_code_used) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [table_number, subtotal_price, discount_amount, total_price, transaction_id, promo_code || null]
    );
    const order = orderRows[0];

    // 4. Create Order Items
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, food_id, qty, notes) VALUES ($1, $2, $3, $4)',
        [order.id, item.food_id, item.qty, item.notes || '']
      );
    }

    await client.query('COMMIT');

    // Here we would typically call Midtrans Snap API to get payment token.
    // We mock it for development.
    const paymentToken = `mock-token-${transaction_id}`;

    res.status(201).json({
      order,
      payment_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${paymentToken}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/orders (Kasir/Admin)
router.get('/', [verifyToken, isKasirOrAdmin], async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/orders/:id/status (Kasir/Admin)
router.put('/:id/status', [verifyToken, isKasirOrAdmin], async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  if (!['received', 'cooking', 'done'].includes(order_status)) {
    return res.status(400).json({ error: 'Invalid order_status' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE orders SET order_status = $1 WHERE id = $2 RETURNING *',
      [order_status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
