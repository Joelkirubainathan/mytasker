# MyTasker 🚀

A production-ready personal task and productivity web application.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT (access + refresh token rotation) |
| State | Zustand + React Query |
| Charts | Recharts |

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+

### Setup

**Windows:**
```bash
setup.bat
```

**Or manually:**
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### Run (Development)

From the project root:
```bash
npm run dev
```

This starts:
- **Backend** → http://localhost:3001
- **Frontend** → http://localhost:5173

Open **http://localhost:5173** in your browser.

### Demo Account (Pre-seeded)

You can seed realistic demo tasks, categories, reminders, and activity history:
```bash
cd server && npm run db:seed
```

| Field | Demo Value |
|---|---|
| **Email** | `demo@mytasker.app` |
| **Password** | `Password123!` |

You can also register a brand new account at `/register`.

## Features

### Core
- ✅ **Authentication** — Register, login, logout, JWT with refresh tokens
- ✅ **Dashboard** — Stats, progress ring, Focus Now, activity feed, weekly chart
- ✅ **Tasks** — Full CRUD, priority, status, categories, due dates, notes
- ✅ **Subtasks** — Checklist with automatic progress calculation
- ✅ **Progress Tracking** — Checklist-based or manual slider
- ✅ **Task Completion** — One-click complete with animation
- ✅ **Task History** — Permanent history of completed/archived tasks
- ✅ **Activity Log** — Full activity timeline per task
- ✅ **Categories** — Create, edit, delete safely (tasks are never lost)
- ✅ **Time Tracking** — Start/stop timer, session history, total time
- ✅ **Reminders** — Per-task reminders with cron-based delivery
- ✅ **Notifications** — Notification center with unread badge
- ✅ **Calendar** — Monthly view with due dates
- ✅ **Analytics** — Completion trends, category performance, productivity stats
- ✅ **Data Export** — JSON and CSV export
- ✅ **Light/Dark/System** theme with persistence

### UX
- ✅ Responsive (mobile, tablet, desktop)
- ✅ Bottom navigation on mobile
- ✅ Skeleton loaders
- ✅ Empty states
- ✅ Confirmation dialogs for destructive actions
- ✅ Toast notifications
- ✅ Keyboard accessible
- ✅ Search + filter + sort

## Project Structure

```
mytasker/
├── client/          # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route pages
│       ├── hooks/        # React Query hooks
│       ├── store/        # Zustand state
│       ├── lib/          # API client
│       ├── types/        # TypeScript types
│       └── utils/        # Helpers
├── server/          # Express backend
│   └── src/
│       ├── routes/       # API route handlers
│       ├── middleware/   # Auth middleware
│       ├── services/     # Business logic
│       └── database/     # SQLite setup
└── package.json     # Root scripts
```

## Environment

Server config is in `server/.env`. Key variables:
```
JWT_SECRET=          # Change in production!
JWT_REFRESH_SECRET=  # Change in production!
DATABASE_URL=        # SQLite file path
CLIENT_URL=          # Frontend URL for CORS
```

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15min) + refresh tokens (7 days) with rotation
- Rate limiting on auth endpoints
- Helmet.js security headers
- CORS configured
- All database queries use parameterized statements (SQL injection safe)
- User data isolation — every query scoped to authenticated user ID
