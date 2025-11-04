const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

// protect all routes
router.use(authMiddleware);

/**
 * GET /api/events
 * optional query: status=SWAPPABLE
 */
router.get('/', (req, res) => {
  const userId = req.userId;
  const status = req.query.status;
  let q = `SELECT id, title, start_time as startTime, end_time as endTime, status FROM events WHERE owner_id = ?`;
  const params = [userId];
  if (status) {
    q += ` AND status = ?`;
    params.push(status);
  }
  q += ` ORDER BY start_time`;
  db.all(q, params, (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' });}
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const userId = req.userId;
  const { title, startTime, endTime } = req.body || {};
  if (!title || !startTime || !endTime) return res.status(400).json({ error: 'Missing fields' });
  const stmt = `INSERT INTO events (owner_id, title, start_time, end_time, status) VALUES (?, ?, ?, ?, 'BUSY')`;
  db.run(stmt, [userId, title, startTime, endTime], function (err) {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' }); }
    res.status(201).json({ id: this.lastID, title, startTime, endTime, status: 'BUSY' });
  });
});

router.patch('/:id', (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  const { title, startTime, endTime, status } = req.body || {};
  // first check ownership
  db.get(`SELECT owner_id FROM events WHERE id = ?`, [id], (err, row) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' }); }
    if (!row) return res.status(404).json({ error: 'Event not found' });
    if (row.owner_id !== userId) return res.status(403).json({ error: 'Not owner' });

    const updates = [];
    const params = [];
    if (title) { updates.push('title = ?'); params.push(title); }
    if (startTime) { updates.push('start_time = ?'); params.push(startTime); }
    if (endTime) { updates.push('end_time = ?'); params.push(endTime); }
    if (status) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) return res.json({ ok: true });

    const q = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);
    db.run(q, params, function (err2) {
      if (err2) { console.error(err2); return res.status(500).json({ error: 'DB error' }); }
      res.json({ ok: true });
    });
  });
});

router.delete('/:id', (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  db.get(`SELECT owner_id FROM events WHERE id = ?`, [id], (err, row) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' }); }
    if (!row) return res.status(404).json({ error: 'Event not found' });
    if (row.owner_id !== userId) return res.status(403).json({ error: 'Not owner' });
    db.run(`DELETE FROM events WHERE id = ?`, [id], function (err2) {
      if (err2) { console.error(err2); return res.status(500).json({ error: 'DB error' }); }
      res.json({ ok: true });
    });
  });
});

module.exports = router;
