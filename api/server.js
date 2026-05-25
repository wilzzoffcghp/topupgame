// api/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/order', require('./routes/order'));
app.use('/api/deposit', require('./routes/deposit'));
app.use('/api/user', require('./routes/user'));
app.use('/api/reseller', require('./routes/reseller'));
app.use('/api/v1', require('./routes/reseller-api')); // Public reseller API

// Serve frontend pages
const pages = ['game', 'order', 'login', 'register', 'dashboard', 'deposit', 'docs', 'reseller'];
pages.forEach(p => {
  app.get(`/${p}`, (req, res) => res.sendFile(path.join(__dirname, `../public/${p}.html`)));
  app.get(`/${p}/*`, (req, res) => res.sendFile(path.join(__dirname, `../public/${p}.html`)));
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
