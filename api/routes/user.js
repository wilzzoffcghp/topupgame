// api/routes/user.js
const express = require('express');
const router = express.Router();
const db = require('../../lib/github-db');
const { authMiddleware } = require('../../lib/auth');

// GET /api/user/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { user } = await db.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const { password, ...userPublic } = user;
    const reseller = await db.getResellerByUserId(user.id);

    res.json({
      success: true,
      data: {
        ...userPublic,
        is_reseller: !!reseller,
        reseller_api_key: reseller ? reseller.api_key : null
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
