# Rotating Mailer

Node.js rotating mail sender with per-account quotas and round-robin rotation, backed by MongoDB + BullMQ (Redis).

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. Start Redis
4. `npm run dev` (or `npm start`)

API:
- POST /api/accounts -> add account
- GET /api/accounts -> list accounts
- POST /api/campaigns/send -> send campaign (recipients, subject, template, globalData)
