# Roomie Finder

A full-stack platform to help users find compatible roommates, browse room listings, chat in real time, and split shared living expenses.

## Tech Stack

- **Frontend (`client/`)**: React 19, Vite 8, React Router 7, TanStack React Query, Zustand, Axios, Socket.IO Client, Tailwind CSS v4
- **Backend (`server/`)**: Node.js, Express, Socket.IO, JWT (HTTP-only cookies + Bearer + Neon session tracking), Multer, Zod
- **Database**: Neon (Lakebase PostgreSQL) + Prisma ORM (`roomie_finder` schema)

## Project Folder Structure 

```text
project-roomie-finder/
├── client/                   # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # React Query & Socket.IO hooks
│   │   ├── pages/            # Route pages (Home, Chat, Expenses, Profile, etc.)
│   │   ├── routes/           # AppRoutes & ProtectedRoute
│   │   ├── services/         # Axios API & Socket.IO clients
│   │   ├── store/            # Zustand global state (auth, theme, expenses)
│   │   └── utils/            # Expense math helpers
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                   # Express + Prisma backend
│   ├── prisma/
│   │   └── schema.prisma     # Database models & indexes
│   ├── src/
│   │   ├── config/           # Env & Prisma client
│   │   ├── middleware/       # Session-backed JWT auth, Multer upload, error handler
│   │   ├── routes/           # REST API endpoints
│   │   ├── services/         # Storage service (local /uploads, swappable for S3)
│   │   ├── socket/           # Socket.IO real-time chat handler
│   │   ├── utils/            # Response serializers
│   │   ├── app.js            # Express app setup
│   │   └── index.js          # HTTP + Socket.IO server entry
│   └── .env.example
├── .gitignore
├── package.json              # Root workspace scripts
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
     Add your Neon pooled `DATABASE_URL`, direct `DATABASE_URL_DIRECT`, and a random `JWT_SECRET`.

3. **Push Prisma schema to Neon**:
   ```bash
   npm run db:push
   ```

4. **Start backend & frontend** (in two terminals):
   ```bash
   npm run dev:server
   npm run dev:client
   ```
