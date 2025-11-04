# Slot Swapper (MySQL Version)

This is a customized version of the original SlotSwapper app — now using **MySQL** instead of SQLite.

## Features
- Signup / Login (JWT)
- User events (create, list, update status)
- Mark event SWAPPABLE
- Marketplace view to see other users' swappable slots
- Request swaps (transactional)
- Accept / Reject swaps (transactional) — swaps owners of events on accept

## Tech Stack
- **Backend:** Node.js, Express, MySQL
- **Frontend:** React (Vite)

## Run locally

### Backend
1. `cd backend`
2. `npm install`
3. Create a `.env` file and set:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=slotswapper
   JWT_SECRET=your_secret_key

### Frontend
1. `cd frontend`
2. `npm run dev`