import express from 'express';
import pool from '../config/db.js';
import { verifyToken, isKasirOrAdmin } from '../middlewares/auth.js';
import midtransClient from 'midtrans-client';
import { broadcast } from '../config/websocket.js';

const router = express.Router();

// Inisialisasi Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

// GET /api/orders/config (Public)
router.get('/config', (req, res) => {
  res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY || '' });
});

// GET /api/orders/track/:transaction_id (Public)
router.get('/track/:transaction_id', async (req, res) => {
  const { transaction_id } = req.params;
  try {
    const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE transaction_id = $1', [transaction_id]);
    if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRows[0];

    const { rows: itemRows } = await pool.query(`
      SELECT oi.*, f.name, f.price, f.discount_price 
      FROM order_items oi
      JOIN foods f ON oi.food_id = f.id
      WHERE oi.order_id = $1
    `, [order.id]);

    res.json({ order, items: itemRows });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/verify/:transaction_id (Public)
router.get('/verify/:transaction_id', async (req, res) => {
  const { transaction_id } = req.params;
  try {
    const { rows } = await pool.query('SELECT id, payment_status FROM orders WHERE transaction_id = $1', [transaction_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    let currentStatus = rows[0].payment_status;

    // Jika belum lunas, coba cek ke Midtrans (bypass keharusan webhook lokal)
    if (currentStatus === 'pending') {
      try {
        const statusResponse = await snap.transaction.status(transaction_id);
        const { transaction_status } = statusResponse;
        
        let new_payment_status = 'pending';
        if (['capture', 'settlement'].includes(transaction_status)) {
          new_payment_status = 'paid';
        } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
          new_payment_status = 'expired';
        } else if (transaction_status === 'failure') {
          new_payment_status = 'failed';
        }

        if (new_payment_status !== currentStatus) {
          await pool.query('UPDATE orders SET payment_status = $1 WHERE transaction_id = $2', [new_payment_status, transaction_id]);
          currentStatus = new_payment_status;
          
          // Kasih tau kasir bahwa ada pembayaran berhasil
          broadcast('PAYMENT_UPDATE', {
            orderId: rows[0].id,
            transactionId: transaction_id,
            paymentStatus: new_payment_status,
          });
        }
      } catch (midtransError) {
        console.warn('Midtrans check error:', midtransError.message);
      }
    }

    res.json({ payment_status: currentStatus });
  } catch (error) {
    console.error('Verify order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders (Public)
router.post('/', async (req, res) => {
  const { customer_name, table_number, items, promo_code } = req.body;
  // items: [{ food_id: 1, qty: 2, notes: '' }]

  if (!customer_name || !table_number || !items || items.length === 0) {
    return res.status(400).json({ error: 'customer_name, table_number, and items are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Calculate subtotal
    let subtotal_price = 0;
    const itemDetails = []; // Untuk dikirim ke Midtrans

    for (const item of items) {
      const { rows } = await client.query('SELECT name, price, discount_price FROM foods WHERE id = $1', [item.food_id]);
      if (rows.length === 0) throw new Error(`Food ID ${item.food_id} not found`);
      
      const food = rows[0];
      const effectivePrice = food.discount_price > 0 ? food.discount_price : food.price;
      subtotal_price += effectivePrice * item.qty;

      itemDetails.push({
        id: `FOOD-${item.food_id}`,
        price: effectivePrice,
        quantity: item.qty,
        name: food.name.substring(0, 50) // Max 50 chars for Midtrans
      });
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
          
          // Tambahkan diskon sebagai item negatif ke Midtrans
          itemDetails.push({
            id: 'PROMO',
            price: -discount_amount,
            quantity: 1,
            name: `Promo ${promo.code}`
          });
        }
      }
    }

    const total_price = Math.max(0, subtotal_price - discount_amount);
    const transaction_id = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 3. Create Order
    const initialPaymentStatus = total_price === 0 ? 'paid' : 'pending';
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (customer_name, table_number, subtotal_price, discount_amount, total_price, transaction_id, promo_code_used, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [customer_name, table_number, subtotal_price, discount_amount, total_price, transaction_id, promo_code || null, initialPaymentStatus]
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

    // Buat parameter transaksi Midtrans
    const parameter = {
      transaction_details: {
        order_id: transaction_id,
        gross_amount: total_price
      },
      item_details: itemDetails,
      customer_details: {
        first_name: customer_name,
        notes: `Meja ${table_number}`
      },
      callbacks: {
        finish: `http://localhost:5173/track/${transaction_id}`,
        error: `http://localhost:5173/checkout`,
        unfinish: `http://localhost:5173/checkout`
      }
    };

    let payment_url = null;
    let payment_token = null;
    
    // Hanya minta token jika total > 0 (jika 0 artinya 100% diskon, tidak perlu bayar)
    if (total_price > 0 && process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_SERVER_KEY !== 'SB-Mid-Server-xxxxxx') {
      const transaction = await snap.createTransaction(parameter);
      payment_token = transaction.token;
      payment_url = transaction.redirect_url;
    } else if (total_price > 0) {
       // Fallback mock url jika server key belum di set
       payment_token = `mock-token-${transaction_id}`;
       payment_url = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${payment_token}`;
       console.warn("Menggunakan Mock Payment karena MIDTRANS_SERVER_KEY belum di-set di .env");
    }

    // Simpan token ke database agar bisa digunakan bayar ulang di TrackOrder
    if (payment_token) {
      await pool.query('UPDATE orders SET payment_token = $1 WHERE id = $2', [payment_token, order.id]);
      order.payment_token = payment_token;
    }

    res.status(201).json({
      order,
      payment_token,
      payment_url
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
    const { rows } = await pool.query("SELECT * FROM orders WHERE payment_status = 'paid' ORDER BY created_at DESC");
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
    
    const updatedOrder = rows[0];
    
    // Broadcast status update
    broadcast('ORDER_STATUS_UPDATE', {
      transactionId: updatedOrder.transaction_id,
      orderStatus: updatedOrder.order_status
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
