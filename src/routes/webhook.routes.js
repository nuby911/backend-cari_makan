import express from 'express';
import pool from '../config/db.js';
import { broadcast } from '../config/websocket.js';

const router = express.Router();

// POST /api/webhook/midtrans
router.post('/midtrans', async (req, res) => {
  const { transaction_status, order_id } = req.body;
  // Note: order_id from midtrans usually matches transaction_id in our DB

  if (!transaction_status || !order_id) {
    return res.status(400).send('Invalid payload');
  }

  let payment_status = 'pending';
  if (['capture', 'settlement'].includes(transaction_status)) {
    payment_status = 'paid';
  } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
    payment_status = 'expired';
  } else if (transaction_status === 'failure') {
    payment_status = 'failed';
  }

  try {
    const { rows } = await pool.query(
      'UPDATE orders SET payment_status = $1 WHERE transaction_id = $2 RETURNING *',
      [payment_status, order_id]
    );

    if (rows.length > 0) {
      const order = rows[0];
      // Broadcast to WebSocket clients
      broadcast('PAYMENT_UPDATE', {
        orderId: order.id,
        transactionId: order.transaction_id,
        paymentStatus: order.payment_status,
      });
      console.log(`Payment updated and broadcasted for ${order_id}: ${payment_status}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
