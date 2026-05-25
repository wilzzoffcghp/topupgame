// api/routes/deposit.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const db = require('../../lib/github-db');
const { authMiddleware } = require('../../lib/auth');

const DP_BASE = 'https://digitalpediah2h.orderhostid.my.id/api';

// POST /api/deposit/create
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 10000) {
      return res.status(400).json({ success: false, message: 'Minimal deposit Rp10.000' });
    }

    const { user } = await db.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    // Create deposit via Digital Pedia
    const r = await fetch(`${DP_BASE}/deposit/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await r.json();

    if (!data.success) {
      return res.status(400).json({ success: false, message: 'Gagal membuat deposit' });
    }

    // Save to DB
    const deposit = {
      deposit_id: data.deposit.id,
      user_id: user.id,
      user_email: user.email,
      amount,
      qr_image: data.deposit.qr_image,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await db.createDeposit(deposit);

    res.json({
      success: true,
      data: {
        deposit_id: data.deposit.id,
        amount,
        qr_image: data.deposit.qr_image,
        status: 'pending'
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/deposit/check
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { deposit_id } = req.body;
    if (!deposit_id) return res.status(400).json({ success: false, message: 'deposit_id wajib diisi' });

    const deposit = await db.getDepositById(deposit_id);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit tidak ditemukan' });

    if (deposit.user_id !== req.user.id && deposit.user_email !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    if (deposit.status === 'success') {
      return res.json({ success: true, status: 'success', message: 'Deposit sudah dikonfirmasi' });
    }

    // Check with Digital Pedia
    const r = await fetch(`${DP_BASE}/deposit/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deposit_id })
    });
    const data = await r.json();

    if (data.success && data.status === 'success') {
      // Update deposit status
      await db.updateDeposit(deposit_id, { status: 'success', confirmed_at: new Date().toISOString() });

      // Add balance to user
      const { user } = await db.getUserByEmail(deposit.user_email);
      if (user) {
        await db.updateUser(deposit.user_email, { balance: (user.balance || 0) + deposit.amount });
      }

      res.json({ success: true, status: 'success', message: 'Pembayaran dikonfirmasi! Saldo telah ditambahkan.' });
    } else {
      res.json({ success: true, status: 'pending', message: 'Menunggu pembayaran...' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/deposit/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { data } = await db.getDeposits();
    const deps = Array.isArray(data) ? data : [];
    const userDeps = deps.filter(d => d.user_email === req.user.email).reverse();
    res.json({ success: true, data: userDeps });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
