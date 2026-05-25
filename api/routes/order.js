// api/routes/order.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const db = require('../../lib/github-db');
const { authMiddleware } = require('../../lib/auth');

const ZXUAN_BASE = 'https://apis.zxuantopup.app/v1';
const ZXUAN_KEY = process.env.ZXUAN_API_KEY || 'zxt_live_prd_98a2c1d4e5f6a7b8c9d0';
const MARKUP = 1000;

const zxHeaders = {
  'Content-Type': 'application/json',
  'X-Api-Key': ZXUAN_KEY
};

// POST /api/order/create
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { product_code, target, target_zone, slug } = req.body;
    if (!product_code || !target) {
      return res.status(400).json({ success: false, message: 'product_code dan target wajib diisi' });
    }

    // Get current user balance
    const { user } = await db.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    // Get product price first
    const productRes = await fetch(`${ZXUAN_BASE}/game/${slug}/product/${product_code}`, { headers: zxHeaders });
    const productData = await productRes.json();
    if (!productData.success) return res.status(400).json({ success: false, message: 'Produk tidak ditemukan' });

    const totalPrice = productData.data.price + MARKUP;

    if (user.balance < totalPrice) {
      return res.status(400).json({ success: false, message: 'Saldo tidak cukup. Silakan deposit terlebih dahulu.' });
    }

    // Place order to ZXuan
    const orderBody = { product_code, target };
    if (target_zone) orderBody.target_zone = target_zone;

    const orderRes = await fetch(`${ZXUAN_BASE}/game/order`, {
      method: 'POST',
      headers: zxHeaders,
      body: JSON.stringify(orderBody)
    });
    const orderData = await orderRes.json();

    if (!orderData.success) {
      return res.status(400).json({ success: false, message: orderData.message || 'Order gagal' });
    }

    // Deduct balance
    await db.updateUser(req.user.email, { balance: user.balance - totalPrice });

    // Save transaction to DB
    const tx = {
      order_id: orderData.data.order_id,
      user_id: user.id,
      user_email: user.email,
      product_code: orderData.data.product_code,
      product_name: orderData.data.product_name,
      target: orderData.data.target,
      price: totalPrice,
      original_price: productData.data.price,
      markup: MARKUP,
      status: orderData.data.status,
      reference: orderData.data.reference,
      created_at: new Date().toISOString()
    };

    await db.createTransaction(tx);

    res.json({
      success: true,
      message: orderData.message,
      data: {
        ...orderData.data,
        price: totalPrice
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/order/status
router.post('/status', authMiddleware, async (req, res) => {
  try {
    const { trx_ref } = req.body;
    if (!trx_ref) return res.status(400).json({ success: false, message: 'trx_ref wajib diisi' });

    const r = await fetch(`${ZXUAN_BASE}/game/status`, {
      method: 'POST',
      headers: zxHeaders,
      body: JSON.stringify({ trx_ref })
    });
    const data = await r.json();

    // Update local DB status if success/failed
    if (data.success && ['success', 'failed'].includes(data.data.status)) {
      await db.updateTransaction(trx_ref, { status: data.data.status, sn: data.data.sn, completed_at: data.data.completed_at });
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/order/history - user transaction history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { user } = await db.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const txs = await db.getTransactionsByUser(user.id);
    res.json({ success: true, data: txs.reverse() });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
