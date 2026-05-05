# FarmToTable - Setup Guide

This folder contains the project app (`Next.js + TypeScript + PostgreSQL + NextAuth`).

## 1) Requirements

- Node.js 20+ (23 also works)
- npm
- PostgreSQL running locally (we use port `5432`)

## 2) Install dependencies

From this `code` folder:

```bash
npm install
```

## 3) Configure environment variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Set values in `.env.local`:

```env
DATABASE_URL=postgresql://<db_user>@localhost:5432/farmtotable
NEXTAUTH_SECRET=<long-random-secret>
NEXTAUTH_URL=http://localhost:3000
```

Important:
- Use your real local PostgreSQL username (for many machines this is your macOS username, not `postgres`).
- `NEXTAUTH_SECRET` must be present.

## 4) Prepare PostgreSQL

Make sure PostgreSQL is accepting connections:

```bash
pg_isready -h localhost -p 5432
```

Create the database once:

```bash
createdb -h localhost farmtotable
```

If it already exists, that is fine.

## 5) Initialize schema

Run:

```bash
npm run db:init
```

This applies `src/db/schema.sql` (users, roles, and auth-related base tables).

## 6) Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 7) Verify auth flow

- Register a new account at `/register`
- Login at `/login`
- Access protected page `/dashboard`
- Logout from dashboard navbar

## 8) Build and quality checks

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

Run production server:

```bash
npm run start
```

## 9) Common issues

- `DATABASE_URL is missing`
  - `.env.local` is missing or incomplete.

- `role "<name>" does not exist`
  - Your `DATABASE_URL` user is wrong. Use an existing local Postgres role.

- `ECONNREFUSED localhost:5432`
  - PostgreSQL is not running or not listening on port `5432`.

- `database "farmtotable" does not exist`
  - Run `createdb -h localhost farmtotable`.
