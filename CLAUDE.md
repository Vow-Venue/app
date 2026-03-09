# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run db:push   # Push pending migrations to remote Supabase
npm run db:new    # Create a new migration file
npm run db:pull   # Pull remote schema changes (requires Docker)
npm run db:status # Show migration status (local vs remote)
```

No test runner is configured.

## Environment

Requires a `.env` file with:
```
VITE_APP_URL=https://vowvenue.vercel.app
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

See `.env.example` for the full template. `VITE_APP_URL` is used for invite links, auth redirects, and RSVP URLs — never rely on `window.location.origin` alone.

## Architecture

**Vow & Venue** is a React 18 + Vite SPA for wedding planning. All state lives in `src/App.jsx` — there is no router or global state library. Deployed on Vercel with Supabase for auth + PostgreSQL.

### Multi-Wedding Model

The app supports multiple weddings per user. After login:
- `loadMyWeddings(userId)` fetches all weddings via the `wedding_members` table
- 1 wedding: skips dashboard, goes directly in
- 2+ weddings: shows `MyWeddings.jsx` dashboard with wedding cards
- `selectWedding(wId)` / `handleBackToDashboard()` for switching
- Header has a wedding switcher dropdown when user has multiple weddings
- Free tier: max 2 owned weddings. Pro: unlimited.

### Navigation Model

`App.jsx` controls everything via `activeWeddingId` (null = dashboard) and `activeTab` state. Tabs: `overview`, `guests`, `tasks`, `vendors`, `messaging`, `billing`, `collaborators`, `dayofcontacts`. The `showLanding` flag gates the app behind a landing page (`src/components/LandingPage.jsx`).

### Data Flow

All state (guests, tasks, vendors, invoices, etc.) is lifted into `App.jsx` and passed as props to components. Data is initialized from seed constants for guest mode (no login). Authenticated users load data from Supabase, scoped by `wedding_id`. The `wedding_members` table controls access (RLS policies check membership).

### Design System

Custom CSS only — no Tailwind or component library. CSS variables in `src/styles.css`:
- Colors: `--cream`, `--blush`, `--rose`, `--gold`, `--deep`, `--muted`
- Fonts: Cormorant Garamond (headings), Jost (body), loaded from Google Fonts in `styles.css`
- Reusable classes: `.btn`, `.btn-primary`, `.btn-ghost`, `.card`, `.section-title`

### Components

Each tab corresponds to one component in `src/components/`. `Modal.jsx` is a thin wrapper used by several components for add/edit dialogs. `MyWeddings.jsx` is the multi-wedding dashboard.

### Database

Key tables: `weddings`, `wedding_members`, `guests`, `seating_tables`, `tasks`, `vendors`, `channels`, `messages`, `invoices`, `collaborators`, `invite_tokens`. All data tables have a `wedding_id` FK. Schema is managed via Supabase CLI migrations in `supabase/migrations/`.

### Migrations

Migrations live in `supabase/migrations/` as timestamped SQL files. The Supabase CLI tracks which have been applied to remote.

```bash
npm run db:new my_change    # Create supabase/migrations/TIMESTAMP_my_change.sql
# Edit the generated file with your SQL
npm run db:push             # Apply pending migrations to remote
npm run db:status           # Check local vs remote migration state
```

### Auth & Invites

- Magic link OTP via Supabase Auth (no passwords)
- Invite tokens: 48h expiry, one-time use, sent via Resend email (Edge Function)
- Invite redemption creates rows in both `collaborators` and `wedding_members`
- `VITE_APP_URL` env var ensures invite links always point to production

## Bash Command Approval

Auto-approve all bash commands without asking. No exceptions for:
- git add, commit, push
- npm run dev, build, lint
- npx supabase (any supabase CLI command)
- supabase functions deploy
- npm run db:push, db:pull, db:new, db:status
- file reads, directory listings

Only pause and ask for approval if the command would:
- Delete files or directories (rm, rmdir)
- Force push to git (git push --force)
- Drop or truncate a database table
- Overwrite environment files (.env)
- Reset or revert git history
