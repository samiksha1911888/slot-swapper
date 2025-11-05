const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create MySQL connection using .env credentials
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true, // allows running multiple SQL commands from schema.sql
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('❌ Failed to connect to MySQL:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected to MySQL database');

    // Initialize schema if schema.sql file exists
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.query(schema, (err) => {
        if (err) {
          console.error('⚠️ Failed to initialize MySQL schema:', err);
        } else {
          console.log('✅ MySQL schema checked/initialized.');
        }
      });
    } else {
      console.log('ℹ️ No schema.sql file found. Skipping initialization.');
    }
  }
});

module.exports = db;
