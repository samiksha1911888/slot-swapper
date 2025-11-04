const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'slotswapper.db');

const initializing = !fs.existsSync(DB_FILE);
const db = new sqlite3.Database(DB_FILE);

if (initializing) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('Failed to initialize DB schema:', err);
    } else {
      console.log('Database initialized.');
    }
  });
}

module.exports = db;
