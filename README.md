# SlotSwapper

A simple full-stack Slot Swapping application: users create time slots (events), mark some as swappable, view others' swappable slots, request swaps and accept/reject swap requests. This fork replaces the original SQLite data-store with MySQL for a more production-like environment and better transactional guarantees.

---

## Design choices & short overview

- **Backend:** Node.js + Express. Simple modular route structure (`/routes/auth.js`, `/routes/events.js`, `/routes/swaps.js`) and `db.js` exporting a MySQL connection.
- **Database:** MySQL (switched from SQLite). Transactions are used for swap requests/accepts to ensure atomic swaps.
- **Auth:** JWT-based, with `authMiddleware` protecting routes. Passwords hashed with `bcrypt`.
- **Frontend:** React (Vite) — lightweight single-page app that consumes the REST API.
- **Why MySQL:** persistent, widely available in production environments and better for concurrent transactional behavior compared to single-file SQLite.

---

## Requirements

- Node.js (>= 16 recommended)
- npm
- MySQL server (local or remote)
- (Optional) DB Browser for SQLite — not used in MySQL version

---

## Setup & Run locally (step-by-step)

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/slot-swapper.git
cd slot-swapper

---

Backend — install
cd backend
npm install

---

Create a .env file in /backend (or copy .env.example if present) and set:

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=slotswapper
DB_PORT=3306
JWT_SECRET=your_jwt_secret_here
PORT=4000

---

Create the database (in MySQL client / Workbench / CLI):

CREATE DATABASE slotswapper;
If schema.sql exists in /backend, it will be executed on server start (db.js has initialization logic). If not, import the converted MySQL schema manually:

-- example: run the schema.sql file using mysql CLI
mysql -u root -p slotswapper < backend/schema.sql

Start the backend:
npm start  # or npm start (check package.json)
Server typically listens on http://localhost:4000 (or the PORT in .env).

---

frontend — install & run

Open a new terminal:

cd frontend
npm install
npm run dev
Vite dev server typically runs at http://localhost:5173.

---

Challenges & notes during conversion

Original project used SQLite with db.run, db.all, db.get semantics. These were converted to MySQL (db.query) and schemas adjusted (AUTOINCREMENT → AUTO_INCREMENT, TEXT → VARCHAR/TEXT, enum replacements).
Push to GitHub initially blocked by secret scanning — ensure no secrets or tokens are committed. Use .env for secrets and add them to .gitignore.
Rebase conflicts resolved for README during the initial push (keep a clean commit history).

---

Future improvements

Add comprehensive unit & integration tests for transaction logic.
Add overlapping-slot validation and/or time-range conflict detection.
Add real-time updates (Socket.IO) to notify users of incoming requests.
Add pagination & filters for marketplace (date range, user filters).
Use connection pooling and rate limiting on backend for production.
