const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2 connection/pool
const bcrypt = require('bcrypt');
const { generateToken } = require('../auth');

/**
 * POST /signup
 */
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    const hash = await bcrypt.hash(password, 10);

    const stmt = `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`;
    db.query(stmt, [name, email, hash], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Email already exists' });
        }
        console.error(err);
        return res.status(500).json({ error: 'DB error' });
      }

      const userId = result.insertId;
      const token = generateToken({ userId });
      res.json({ token, user: { id: userId, name, email } });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /login
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Missing fields' });

  const query = `SELECT id, name, email, password_hash FROM users WHERE email = ?`;
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB error' });
    }

    if (results.length === 0)
      return res.status(400).json({ error: 'Invalid credentials' });

    const user = results[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok)
      return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken({ userId: user.id });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });
});

module.exports = router;
