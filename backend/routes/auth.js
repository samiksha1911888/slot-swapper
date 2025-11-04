const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { generateToken } = require('../auth');

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);

  const stmt = `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`;
  db.run(stmt, [name, email, hash], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
      console.error(err);
      return res.status(500).json({ error: 'DB error' });
    }
    const userId = this.lastID;
    const token = generateToken({ userId });
    res.json({ token, user: { id: userId, name, email } });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  db.get(`SELECT id, name, email, password_hash FROM users WHERE email = ?`, [email], async (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!row) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken({ userId: row.id });
    res.json({ token, user: { id: row.id, name: row.name, email: row.email } });
  });
});

module.exports = router;
