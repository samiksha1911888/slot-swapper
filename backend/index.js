const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const db = require('./db');

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api', require('./routes/swaps')); // includes /swappable-slots, /swap-request, /swap-response, /requests/*

// simple health
app.get('/', (req, res) => res.send({ ok: true }));

app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
