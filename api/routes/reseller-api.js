const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const { getDB } = require('../../lib/mongodb');

const ZXUAN_BASE = 'https://apis.zxuantopup.app/v1';
const ZXUAN_KEY = process.env.ZXUAN_API_KEY;
const MARKUP = 1000;
const DP_BASE = process.env.DIGITALPEDIA_BASE_URL || 'https://digitalpediah2h.orderhostid.my.id/api';

const zxHeaders = {
  'Content-Type': 'application/json',
  'X-Api-Key': ZXUAN_KEY
};

async function resellerAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ success: false, message: 'X-Api-Key header diperlukan' });
  const db = getDB();
  const reseller = await db.collection('resellers').findOne({ api_key: apiKey });
  if (!reseller || reseller.status !== 'active') {
    return res.status(401).json({ success: false, message: 'API Key tidak valid. Daftar reseller di /reseller' });
  }
  req.reseller = reseller;
  next();
}

// GET /api/v1/game/list
router.get('/game/list', resellerAuth, async (req, res) => {
  try {
    const r = await fetch(`${ZXUAN_BASE}/game/list`, { headers: zxHeaders });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar game' });
  }
});

// GET /api/v1/game/:slug/detail
router.get('/game/:slug/detail', resellerAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const r = await fetch(`${ZXUAN_BASE}/game/${slug}/detail`, { headers: zxHeaders });
    const data = await r.json();
    if (data.success && data.data && data.data.products) {
      data.data.products = data.data.products.map(p => ({
        ...p,
        price: p.price + MARKUP
      }));
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail game' });
  }
});

// GET /api/v1/game/:slug/product/:code
router.get('/game/:slug/product/:code', resellerAuth, async (req, res) => {
  try {
    const { slug, code } = req.params;
    const r = await fetch(`${ZXUAN_BASE}/game/${slug}/product/${code}`, { headers: zxHeaders });
    const data = await r.json();
    if (data.success && data.data) data.data.price = data.data.price + MARKUP;
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil produk' });
  }
});

// POST /api/v1/game/order
router.post('/game/order', resellerAuth, async (req, res) => {
  try {
    const { product_code, target, target_zone } = req.body;
    if (!product_code || !target) {
      return res.status(400).json({ success: false, message: 'product_code dan target wajib diisi' });
    }
    const body = { product_code, target };
    if (target_zone) body.target_zone = target_zone;
    const r = await fetch(`${ZXUAN_BASE}/game/order`, {
      method: 'POST',
      headers: zxHeaders,
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (data.success && data.data) {
      data.data.price = (data.data.price || 0) + MARKUP;
      // Simpan transaksi reseller
      const db = getDB();
      await db.collection('transactions').insertOne({
        order_id: data.data.order_id,
        user_id: req.reseller.user_id,
        user_email: req.reseller.user_email,
        source: 'reseller_api',
        product_code,
        product_name: data.data.product_name,
        target,
        price: data.data.price,
        markup: MARKUP,
        status: data.data.status,
        reference: data.data.reference,
        created_at: new Date().toISOString()
      });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/game/status
router.post('/game/status', resellerAuth, async (req, res) => {
  try {
    const { trx_ref } = req.body;
    if (!trx_ref) return res.status(400).json({ success: false, message: 'trx_ref wajib diisi' });
    const r = await fetch(`${ZXUAN_BASE}/game/status`, {
      method: 'POST',
      headers: zxHeaders,
      body: JSON.stringify({ trx_ref })
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/deposit/create
router.post('/deposit/create', resellerAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 10000) {
      return res.status(400).json({ success: false, message: 'Minimal deposit Rp10.000' });
    }
    const r = await fetch(`${DP_BASE}/deposit/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await r.json();
    if (data.success) {
      const db = getDB();
      await db.collection('deposits').insertOne({
        deposit_id: data.deposit.id,
        user_id: req.reseller.user_id,
        user_email: req.reseller.user_email,
        amount,
        qr_image: data.deposit.qr_image,
        status: 'pending',
        source: 'reseller_api',
        created_at: new Date().toISOString()
      });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/deposit/status
router.post('/deposit/status', resellerAuth, async (req, res) => {
  try {
    const { deposit_id } = req.body;
    if (!deposit_id) return res.status(400).json({ success: false, message: 'deposit_id wajib diisi' });
    const r = await fetch(`${DP_BASE}/deposit/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deposit_id })
    });
    const data = await r.json();
    if (data.success && data.status === 'success') {
      const db = getDB();
      const deposit = await db.collection('deposits').findOne({ deposit_id });
      if (deposit && deposit.status !== 'success') {
        await db.collection('deposits').updateOne(
          { deposit_id },
          { $set: { status: 'success', confirmed_at: new Date().toISOString() } }
        );
        await db.collection('users').updateOne(
          { email: deposit.user_email },
          { $inc: { balance: deposit.amount } }
        );
      }
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;