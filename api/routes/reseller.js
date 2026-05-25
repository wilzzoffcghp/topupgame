// api/routes/reseller.js
const express = require('express');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../../lib/github-db');
const { authMiddleware } = require('../../lib/auth');

const DP_BASE = 'https://digitalpediah2h.orderhostid.my.id/api';
const RESELLER_PRICE = 15000;

// POST /api/reseller/register - create payment for reseller
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const { user } = await db.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    // Check if already reseller
    const existing = await db.getResellerByUserId(user.id);
    if (existing) return res.status(400).json({ success: false, message: 'Anda sudah terdaftar sebagai reseller' });

    // Create QRIS payment via Digital Pedia
    const r = await fetch(`${DP_BASE}/deposit/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: RESELLER_PRICE })
    });
    const data = await r.json();

    if (!data.success) {
      return res.status(400).json({ success: false, message: 'Gagal membuat pembayaran' });
    }

    // Save pending reseller payment in deposit DB with special tag
    const deposit = {
      deposit_id: data.deposit.id,
      user_id: user.id,
      user_email: user.email,
      amount: RESELLER_PRICE,
      qr_image: data.deposit.qr_image,
      status: 'pending',
      type: 'reseller_registration',
      created_at: new Date().toISOString()
    };
    await db.createDeposit(deposit);

    res.json({
      success: true,
      message: 'Scan QR untuk membayar biaya reseller Rp15.000',
      data: {
        deposit_id: data.deposit.id,
        amount: RESELLER_PRICE,
        qr_image: data.deposit.qr_image
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/reseller/verify-payment
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { deposit_id } = req.body;
    if (!deposit_id) return res.status(400).json({ success: false, message: 'deposit_id wajib diisi' });

    const deposit = await db.getDepositById(deposit_id);
    if (!deposit || deposit.user_email !== req.user.email || deposit.type !== 'reseller_registration') {
      return res.status(404).json({ success: false, message: 'Pembayaran tidak ditemukan' });
    }

    if (deposit.status === 'success') {
      // Already verified, check if reseller created
      const existing = await db.getResellerByUserId(deposit.user_id);
      if (existing) return res.json({ success: true, message: 'Sudah terdaftar sebagai reseller', data: existing });
    }

    // Check with Digital Pedia
    const r = await fetch(`${DP_BASE}/deposit/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deposit_id })
    });
    const data = await r.json();

    if (data.success && data.status === 'success') {
      await db.updateDeposit(deposit_id, { status: 'success', confirmed_at: new Date().toISOString() });

      // Create reseller account
      const apiKey = 'rsl_' + uuidv4().replace(/-/g, '').substring(0, 24);
      const reseller = {
        id: uuidv4(),
        user_id: deposit.user_id,
        user_email: deposit.user_email,
        api_key: apiKey,
        status: 'active',
        registered_at: new Date().toISOString()
      };

      await db.createReseller(reseller);
      await db.updateUser(deposit.user_email, { is_reseller: true });

      res.json({
        success: true,
        message: 'Selamat! Anda berhasil terdaftar sebagai reseller.',
        data: { api_key: apiKey }
      });
    } else {
      res.json({ success: false, status: 'pending', message: 'Pembayaran belum dikonfirmasi' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
