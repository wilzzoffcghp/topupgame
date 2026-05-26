const express = require('express');
const router = express.Router();
const { getDB } = require('../../lib/mongodb');
const { authMiddleware } = require('../../lib/auth');

// GET /api/user/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    const { password, ...userPublic } = user;
    // Cek reseller
    const reseller = await db.collection('resellers').findOne({ user_id: user.id });
    res.json({
      success: true,
      data: {
        ...userPublic,
        is_reseller: !!reseller,
        reseller_api_key: reseller ? reseller.api_key : null
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;