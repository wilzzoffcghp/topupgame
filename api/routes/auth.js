const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { getDB } = require('../../lib/mongodb');
const { generateToken } = require('../../lib/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }
    const db = getDB();
    const users = db.collection('users');

    const existingEmail = await users.findOne({ email });
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });

    const existingUsername = await users.findOne({ username });
    if (existingUsername) return res.status(400).json({ success: false, message: 'Username sudah dipakai' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      phone: phone || '',
      balance: 0,
      is_reseller: false,
      created_at: new Date().toISOString()
    };
    await users.insertOne(newUser);
    const token = generateToken(newUser);
    const { password: _, ...userPublic } = newUser;
    res.json({ success: true, message: 'Registrasi berhasil', token, user: userPublic });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }
    const db = getDB();
    const user = await db.collection('users').findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Email atau password salah' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Email atau password salah' });
    const token = generateToken(user);
    const { password: _, ...userPublic } = user;
    res.json({ success: true, message: 'Login berhasil', token, user: userPublic });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;