// api/routes/games.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const ZXUAN_BASE = 'https://apis.zxuantopup.app/v1';
const ZXUAN_KEY = process.env.ZXUAN_API_KEY || 'zxt_live_prd_98a2c1d4e5f6a7b8c9d0';
const MARKUP = 1000;

const zxHeaders = {
  'Content-Type': 'application/json',
  'X-Api-Key': ZXUAN_KEY
};

// GET /api/games/list
router.get('/list', async (req, res) => {
  try {
    const r = await fetch(`${ZXUAN_BASE}/game/list`, { headers: zxHeaders });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar game' });
  }
});

// GET /api/games/:slug/detail
router.get('/:slug/detail', async (req, res) => {
  try {
    const { slug } = req.params;
    const r = await fetch(`${ZXUAN_BASE}/game/${slug}/detail`, { headers: zxHeaders });
    const data = await r.json();

    // Add markup to prices
    if (data.success && data.data && data.data.products) {
      data.data.products = data.data.products.map(p => ({
        ...p,
        original_price: p.price,
        price: p.price + MARKUP
      }));
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail game' });
  }
});

// GET /api/games/:slug/product/:code
router.get('/:slug/product/:code', async (req, res) => {
  try {
    const { slug, code } = req.params;
    const r = await fetch(`${ZXUAN_BASE}/game/${slug}/product/${code}`, { headers: zxHeaders });
    const data = await r.json();

    if (data.success && data.data) {
      data.data.original_price = data.data.price;
      data.data.price = data.data.price + MARKUP;
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil produk' });
  }
});

module.exports = router;
