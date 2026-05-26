const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'topup-secret-key-change-in-production';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token diperlukan' });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ success: false, message: 'Token tidak valid' });
  req.user = decoded;
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware };