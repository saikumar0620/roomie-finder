# Roomie Finder

A full-stack platform to discover nearby rooms, match with compatible roommates, chat in real time, schedule visits, and split shared living expenses & chores.

## Key Features

- **Room Discovery & GPS Nearby Search**: Filter rooms by rent, location, preferences, amenities, and **Rooms Near Me** (`2 km`, `5 km`, `10 km` Haversine radius sorted nearest first) with interactive Leaflet map location picking.
- **Roommate Matching**: Browse roommate seekers with a habit-based **Compatibility Score (`% Match`)** and one-tap chat.
- **Trust & Safety Signals**:
  - **Account Verification (`✓ Verified`)**: 6-digit email OTP verification from the user's Profile.
  - **Verified-Only Quick Filters**: Filter both room listings and roommates by verified users.
  - **Host Activity**: Shows host response activity (`Active today`, `Replies within a few days`, `New host`) on listing details.
- **Real-Time Chat & Inbox**: Socket.IO powered messaging with live **Online** status, **Typing...** indicators, and live **Unread** count badges in navigation.
- **Schedule a Room Visit**: Request a date/time directly from a listing page — automatically creates a `VisitRequest`, posts into the owner-renter chat thread, and emails the owner.
- **Shared Expense Rooms & Chores**:
  - Create rooms, invite members via email links, split bills (`equal`, `exact`, `percentage`), and send personalized email notifications to roommates.
  - **1-Tap UPI Settlement**: Pay roommates via `upi://pay` deep link or scannable QR code using their saved UPI ID.
  - **Shared Chore Board**: Track, toggle, and delete room chores inside each expense room.
- **Auth & Account Security**: Session-backed JWT auth (HTTP-only cookies + Bearer), **Forgot / Reset Password** (15-minute SHA-256 hashed email link), and session revocation on reset.
- **Mobile-First UX & Code Splitting**: Thumb-zone mobile bottom navigation bar, bottom-sheet confirmations, progressive filter disclosure, `React.lazy` route splitting, and Vite vendor chunking.

## Tech Stack

- **Frontend (`client/`)**: React 19, Vite 8 (Rolldown), React Router 7, TanStack React Query, Zustand, Axios, Socket.IO Client, Leaflet, `qrcode`, Tailwind CSS v4
- **Backend (`server/`)**: Node.js, Express, Socket.IO, JWT + Neon `Session` tracking, Multer, Zod, Brevo HTTPS API / Nodemailer SMTP
- **Database**: Neon (Lakebase PostgreSQL) + Prisma ORM (`roomie_finder` schema)

## Project Folder Structure

```text
project-roomie-finder/
├── client/                       # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/           # Navbar, Filters, ListingCard, MapLocationPicker, etc.
│   │   ├── hooks/                # React Query & Socket.IO presence/chat hooks
│   │   ├── pages/                # Route pages (Home, Chat, Inbox, Expenses, Profile, Roommates, Auth)
│   │   ├── routes/               # Lazy-loaded AppRoutes & ProtectedRoute
│   │   ├── services/             # Axios API & Socket.IO clients
│   │   ├── store/                # Zustand stores (auth, theme, expenses)
│   │   └── utils/                # Expense math helpers
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js            # Vendor manualChunks code-splitting config
├── server/                       # Express + Prisma backend
│   ├── prisma/
│   │   └── schema.prisma         # User, Profile, Listing, Chat, Expense, Chore, VisitRequest, Verification models
│   ├── src/
│   │   ├── config/               # Env & Prisma client
│   │   ├── middleware/           # Session-backed JWT auth, rate limiter, Multer upload, error handler
│   │   ├── routes/               # REST API endpoints (auth, profiles, listings, chat, rooms/expenses, uploads)
│   │   ├── services/             # Brevo/SMTP email service & file storage service
│   │   ├── socket/               # Socket.IO real-time chat & presence handler
│   │   ├── utils/                # Response serializers & pagination helpers
│   │   ├── app.js                # Express app setup
│   │   └── index.js              # HTTP + Socket.IO server entry
│   └── .env.example
├── .gitignore
├── package.json                  # Root workspace scripts
└── README.md
```

## Setup

1. **Install all dependencies** (client + server):
   ```bash
   npm run install:all
   ```

2. **Configure environment variables**:
   - `client/.env` (from `client/.env.example`):
     ```env
     VITE_API_URL=http://localhost:5001/api
     VITE_SOCKET_URL=http://localhost:5001
     ```
   - `server/.env` (from `server/.env.example`):
     Configure `DATABASE_URL`, `DATABASE_URL_DIRECT`, `JWT_SECRET`, and email delivery (`BREVO_API_KEY` / `SMTP_*` + `APP_URL`).

3. **Push Prisma schema to Neon**:
   ```bash
   npm run db:push
   ```

4. **Start backend & frontend** (in two terminals):
   ```bash
   npm run dev:server
   npm run dev:client
   ```

## Available Root Scripts

- `npm run dev:server` — Start Express + Socket.IO backend (`http://localhost:5001`)
- `npm run dev:client` — Start Vite frontend (`http://localhost:5173`)
- `npm run build` — Build production client bundle with route & vendor code splitting
- `npm run lint` — Lint client code
- `npm run db:push` — Sync Prisma schema to Neon PostgreSQL
- `npm run db:studio` — Open Prisma Studio
