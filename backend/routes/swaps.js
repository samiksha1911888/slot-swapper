const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

router.use(authMiddleware);

/**
 * GET /api/swappable-slots
 */
router.get('/swappable-slots', (req, res) => {
  const userId = req.userId;
  const q = `
    SELECT e.id, e.title, e.start_time AS startTime, e.end_time AS endTime,
           e.owner_id AS ownerId, u.name AS ownerName
    FROM events e
    JOIN users u ON u.id = e.owner_id
    WHERE e.status = 'SWAPPABLE' AND e.owner_id <> ?
    ORDER BY e.start_time
  `;
  db.query(q, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

/**
 * POST /api/swap-request
 */
router.post('/swap-request', (req, res) => {
  const requesterId = req.userId;
  const { mySlotId, theirSlotId } = req.body || {};
  if (!mySlotId || !theirSlotId)
    return res.status(400).json({ error: 'Missing ids' });

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Transaction error' });

    const fetchEvents = `SELECT id, owner_id, status FROM events WHERE id IN (?, ?)`;
    db.query(fetchEvents, [mySlotId, theirSlotId], (err1, rows) => {
      if (err1 || !rows || rows.length !== 2) {
        db.rollback(() => res.status(400).json({ error: 'Events fetch failed' }));
        return;
      }

      const evMap = {};
      rows.forEach(r => (evMap[r.id] = r));
      const myEv = evMap[mySlotId];
      const theirEv = evMap[theirSlotId];

      if (!myEv || !theirEv || myEv.owner_id !== requesterId) {
        db.rollback(() => res.status(403).json({ error: 'Invalid ownership or events' }));
        return;
      }

      if (myEv.status !== 'SWAPPABLE' || theirEv.status !== 'SWAPPABLE') {
        db.rollback(() => res.status(400).json({ error: 'One or both not swappable' }));
        return;
      }

      const insertSwap = `
        INSERT INTO swap_requests (requester_id, responder_id, requester_event_id, responder_event_id, status)
        VALUES (?, ?, ?, ?, 'PENDING')
      `;
      db.query(insertSwap, [requesterId, theirEv.owner_id, mySlotId, theirSlotId], (err2, result) => {
        if (err2) {
          db.rollback(() => res.status(500).json({ error: 'Insert failed' }));
          return;
        }

        const updateEvents = `UPDATE events SET status = 'SWAP_PENDING' WHERE id IN (?, ?)`;
        db.query(updateEvents, [mySlotId, theirSlotId], err3 => {
          if (err3) {
            db.rollback(() => res.status(500).json({ error: 'Update failed' }));
            return;
          }

          db.commit(err4 => {
            if (err4) {
              db.rollback(() => res.status(500).json({ error: 'Commit failed' }));
              return;
            }
            res.status(201).json({ ok: true, swapRequestId: result.insertId });
          });
        });
      });
    });
  });
});

/**
 * POST /api/swap-response/:requestId
 */
router.post('/swap-response/:requestId', (req, res) => {
  const userId = req.userId;
  const requestId = req.params.requestId;
  const { accept } = req.body || {};

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Transaction error' });

    db.query(`SELECT * FROM swap_requests WHERE id = ?`, [requestId], (err1, results) => {
      const reqRow = results?.[0];
      if (err1 || !reqRow) {
        db.rollback(() => res.status(404).json({ error: 'Request not found' }));
        return;
      }

      if (reqRow.responder_id !== userId) {
        db.rollback(() => res.status(403).json({ error: 'Not authorized' }));
        return;
      }

      if (reqRow.status !== 'PENDING') {
        db.rollback(() => res.status(400).json({ error: 'Already handled' }));
        return;
      }

      db.query(
        `SELECT id, owner_id, status FROM events WHERE id IN (?, ?)`,
        [reqRow.requester_event_id, reqRow.responder_event_id],
        (err2, evRows) => {
          if (err2 || evRows.length !== 2) {
            db.rollback(() => res.status(404).json({ error: 'Events missing' }));
            return;
          }

          const eMap = {};
          evRows.forEach(e => (eMap[e.id] = e));
          const reqEv = eMap[reqRow.requester_event_id];
          const respEv = eMap[reqRow.responder_event_id];

          if (!reqEv || !respEv || reqEv.status !== 'SWAP_PENDING' || respEv.status !== 'SWAP_PENDING') {
            db.rollback(() => res.status(400).json({ error: 'Invalid event state' }));
            return;
          }

          if (!accept) {
            // Reject swap
            db.query(`UPDATE swap_requests SET status='REJECTED', updated_at=NOW() WHERE id=?`, [requestId], err3 => {
              if (err3) return db.rollback(() => res.status(500).json({ error: 'Reject failed' }));
              db.query(
                `UPDATE events SET status='SWAPPABLE' WHERE id IN (?, ?)`,
                [reqRow.requester_event_id, reqRow.responder_event_id],
                err4 => {
                  if (err4) return db.rollback(() => res.status(500).json({ error: 'Event reset failed' }));
                  db.commit(err5 => {
                    if (err5) return db.rollback(() => res.status(500).json({ error: 'Commit failed' }));
                    res.json({ ok: true, status: 'REJECTED' });
                  });
                }
              );
            });
          } else {
            // Accept swap
            const swapOwners = `
              UPDATE events 
              SET owner_id = CASE 
                WHEN id = ? THEN ? 
                WHEN id = ? THEN ? 
              END, status = 'BUSY'
              WHERE id IN (?, ?)
            `;
            db.query(
              swapOwners,
              [
                reqRow.requester_event_id,
                reqRow.responder_id,
                reqRow.responder_event_id,
                reqRow.requester_id,
                reqRow.requester_event_id,
                reqRow.responder_event_id
              ],
              err6 => {
                if (err6) return db.rollback(() => res.status(500).json({ error: 'Swap failed' }));

                db.query(
                  `UPDATE swap_requests SET status='ACCEPTED', updated_at=NOW() WHERE id=?`,
                  [requestId],
                  err7 => {
                    if (err7) return db.rollback(() => res.status(500).json({ error: 'Request update failed' }));
                    db.commit(err8 => {
                      if (err8) return db.rollback(() => res.status(500).json({ error: 'Commit failed' }));
                      res.json({ ok: true, status: 'ACCEPTED' });
                    });
                  }
                );
              }
            );
          }
        }
      );
    });
  });
});

/**
 * GET /api/requests/incoming
 */
router.get('/requests/incoming', (req, res) => {
  const userId = req.userId;
  const q = `
    SELECT sr.*, u1.name AS requesterName, u2.name AS responderName,
           re.title AS requesterTitle, re.start_time AS requesterStart, re.end_time AS requesterEnd,
           pe.title AS responderTitle, pe.start_time AS responderStart, pe.end_time AS responderEnd
    FROM swap_requests sr
    JOIN users u1 ON u1.id = sr.requester_id
    JOIN users u2 ON u2.id = sr.responder_id
    JOIN events re ON re.id = sr.requester_event_id
    JOIN events pe ON pe.id = sr.responder_event_id
    WHERE sr.responder_id = ?
    ORDER BY sr.created_at DESC
  `;
  db.query(q, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

/**
 * GET /api/requests/outgoing
 */
router.get('/requests/outgoing', (req, res) => {
  const userId = req.userId;
  const q = `
    SELECT sr.*, u1.name AS requesterName, u2.name AS responderName,
           re.title AS requesterTitle, re.start_time AS requesterStart, re.end_time AS requesterEnd,
           pe.title AS responderTitle, pe.start_time AS responderStart, pe.end_time AS responderEnd
    FROM swap_requests sr
    JOIN users u1 ON u1.id = sr.requester_id
    JOIN users u2 ON u2.id = sr.responder_id
    JOIN events re ON re.id = sr.requester_event_id
    JOIN events pe ON pe.id = sr.responder_event_id
    WHERE sr.requester_id = ?
    ORDER BY sr.created_at DESC
  `;
  db.query(q, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

module.exports = router;
