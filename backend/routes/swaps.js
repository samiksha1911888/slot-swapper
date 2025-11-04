const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

router.use(authMiddleware);

/**
 * GET /api/swappable-slots
 * returns swappable slots from other users
 */
router.get('/swappable-slots', (req, res) => {
  const userId = req.userId;
  const q = `SELECT e.id, e.title, e.start_time as startTime, e.end_time as endTime, e.owner_id as ownerId, u.name as ownerName
             FROM events e
             JOIN users u ON u.id = e.owner_id
             WHERE e.status = 'SWAPPABLE' AND e.owner_id <> ?
             ORDER BY e.start_time`;
  db.all(q, [userId], (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' }); }
    res.json(rows);
  });
});

/**
 * POST /api/swap-request
 * body: { mySlotId, theirSlotId }
 * Creates swap_request and marks both events as SWAP_PENDING in a transaction
 */
router.post('/swap-request', (req, res) => {
  const requesterId = req.userId;
  const { mySlotId, theirSlotId } = req.body || {};
  if (!mySlotId || !theirSlotId) return res.status(400).json({ error: 'Missing ids' });

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    // lock & fetch both events
    db.all(`SELECT id, owner_id, status FROM events WHERE id IN (?, ?)`, [mySlotId, theirSlotId], (err, rows) => {
      if (err) { console.error(err); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
      if (!rows || rows.length !== 2) { db.run('ROLLBACK'); return res.status(400).json({ error: 'One or both events not found' }); }
      const evMap = {};
      rows.forEach(r => evMap[r.id] = r);
      const myEv = evMap[mySlotId];
      const theirEv = evMap[theirSlotId];
      if (!myEv || !theirEv) { db.run('ROLLBACK'); return res.status(400).json({ error: 'events mismatch' }); }
      if (myEv.owner_id !== requesterId) { db.run('ROLLBACK'); return res.status(403).json({ error: 'You do not own mySlotId' }); }
      if (myEv.status !== 'SWAPPABLE' || theirEv.status !== 'SWAPPABLE') { db.run('ROLLBACK'); return res.status(400).json({ error: 'One or both not swappable' }); }

      // Insert swap_request
      const insert = `INSERT INTO swap_requests (requester_id, responder_id, requester_event_id, responder_event_id, status) VALUES (?, ?, ?, ?, 'PENDING')`;
      db.run(insert, [requesterId, theirEv.owner_id, mySlotId, theirSlotId], function (err2) {
        if (err2) { console.error(err2); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
        // update events to SWAP_PENDING
        db.run(`UPDATE events SET status = 'SWAP_PENDING' WHERE id IN (?, ?)`, [mySlotId, theirSlotId], function (err3) {
          if (err3) { console.error(err3); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
          db.run('COMMIT');
          return res.status(201).json({ ok: true, swapRequestId: this.lastID });
        });
      });
    });
  });
});

/**
 * POST /api/swap-response/:requestId
 * body: { accept: true|false }
 * Only responder can call. If accepted, swap owner_id of events and set status BUSY. If rejected, reset to SWAPPABLE.
 */
router.post('/swap-response/:requestId', (req, res) => {
  const userId = req.userId;
  const requestId = req.params.requestId;
  const { accept } = req.body || {};

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.get(`SELECT * FROM swap_requests WHERE id = ?`, [requestId], (err, reqRow) => {
      if (err) { console.error(err); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
      if (!reqRow) { db.run('ROLLBACK'); return res.status(404).json({ error: 'Request not found' }); }
      if (reqRow.responder_id !== userId) { db.run('ROLLBACK'); return res.status(403).json({ error: 'Not authorized' }); }
      if (reqRow.status !== 'PENDING') { db.run('ROLLBACK'); return res.status(400).json({ error: 'Request already handled' }); }

      // fetch both events
      db.all(`SELECT id, owner_id, status FROM events WHERE id IN (?, ?)`, [reqRow.requester_event_id, reqRow.responder_event_id], (err2, evRows) => {
        if (err2) { console.error(err2); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
        if (!evRows || evRows.length !== 2) { db.run('ROLLBACK'); return res.status(404).json({ error: 'Events missing' }); }

        const eMap = {};
        evRows.forEach(e => eMap[e.id] = e);
        const reqEv = eMap[reqRow.requester_event_id];
        const respEv = eMap[reqRow.responder_event_id];

        if (!reqEv || !respEv) { db.run('ROLLBACK'); return res.status(404).json({ error: 'Events mismatch' }); }
        if (reqEv.status !== 'SWAP_PENDING' || respEv.status !== 'SWAP_PENDING') {
          db.run('ROLLBACK'); return res.status(400).json({ error: 'Events not SWAP_PENDING' });
        }

        if (!accept) {
          // reject: set swap_requests.status = REJECTED and events -> SWAPPABLE
          db.run(`UPDATE swap_requests SET status='REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [requestId], function (err3) {
            if (err3) { console.error(err3); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
            db.run(`UPDATE events SET status='SWAPPABLE' WHERE id IN (?, ?)`, [reqRow.requester_event_id, reqRow.responder_event_id], function (err4) {
              if (err4) { console.error(err4); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
              db.run('COMMIT');
              return res.json({ ok: true, status: 'REJECTED' });
            });
          });
        } else {
          // accept: swap owner_id values and set both events to BUSY; set swap_requests.status=ACCEPTED
          const changeOwner = `UPDATE events SET owner_id = CASE WHEN id = ? THEN ? WHEN id = ? THEN ? END, status = 'BUSY' WHERE id IN (?, ?)`;
          // for readability: requester_event_id -> becomes responder_id; responder_event_id -> becomes requester_id
          db.run(changeOwner,
            [reqRow.requester_event_id, reqRow.responder_id, reqRow.responder_event_id, reqRow.requester_id, reqRow.requester_event_id, reqRow.responder_event_id],
            function (err5) {
              if (err5) { console.error(err5); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
              db.run(`UPDATE swap_requests SET status='ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [requestId], function (err6) {
                if (err6) { console.error(err6); db.run('ROLLBACK'); return res.status(500).json({ error: 'DB error' }); }
                db.run('COMMIT');
                return res.json({ ok: true, status: 'ACCEPTED' });
              });
            });
        }
      });
    });
  });
});

/**
 * GET /api/requests/incoming
 * GET /api/requests/outgoing
 */
router.get('/requests/incoming', (req, res) => {
  const userId = req.userId;
  const q = `SELECT sr.*, u1.name as requesterName, u2.name as responderName,
             re.title as requesterTitle, re.start_time as requesterStart, re.end_time as requesterEnd,
             pe.title as responderTitle, pe.start_time as responderStart, pe.end_time as responderEnd
             FROM swap_requests sr
             JOIN users u1 ON u1.id = sr.requester_id
             JOIN users u2 ON u2.id = sr.responder_id
             JOIN events re ON re.id = sr.requester_event_id
             JOIN events pe ON pe.id = sr.responder_event_id
             WHERE sr.responder_id = ?
             ORDER BY sr.created_at DESC`;
  db.all(q, [userId], (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' }); }
    res.json(rows);
  });
});

router.get('/requests/outgoing', (req, res) => {
  const userId = req.userId;
  const q = `SELECT sr.*, u1.name as requesterName, u2.name as responderName,
             re.title as requesterTitle, re.start_time as requesterStart, re.end_time as requesterEnd,
             pe.title as responderTitle, pe.start_time as responderStart, pe.end_time as responderEnd
             FROM swap_requests sr
             JOIN users u1 ON u1.id = sr.requester_id
             JOIN users u2 ON u2.id = sr.responder_id
             JOIN events re ON re.id = sr.requester_event_id
             JOIN events pe ON pe.id = sr.responder_event_id
             WHERE sr.requester_id = ?
             ORDER BY sr.created_at DESC`;
  db.all(q, [userId], (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' }); }
    res.json(rows);
  });
});

module.exports = router;
