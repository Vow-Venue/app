# IMPORTANT: Read this entire file before doing ANYTHING.

# Vow & Venue — Product Context

ALWAYS read this file at the start of every session before doing anything.

## What We're Building
Vow & Venue is a SaaS wedding planning platform for professional wedding planners and firms. vowvenue.vercel.app

## Tech Stack
React 18 + Vite + Supabase + Custom CSS + Stripe + Resend, deployed on Vercel. GitHub: Vow-Venue/app

## Architecture — Two Zones
- Zone 1: Marketing site (logged out) — `/`, `/features`, `/pricing`
- Zone 2: Web app (logged in) — `/app`
- React Router v6 handles routing (`src/main.jsx` wraps with `<BrowserRouter>`)
- `vercel.json` rewrites all routes to `index.html` for SPA

## User Hierarchy
1. Org Owner — creates organization, pays per seat ($39/mo), invites planners
2. Co-Planner — invited to org, full edit access within assigned weddings
3. Collaborator/Couple — view + comment + message + document upload, NO edit access
4. Collaborator/Vendor — view own vendor card + message + upload docs
5. Collaborator/Family — view + messaging only

## Organization System (TO BUILD)
- Org owner creates org, buys seats, sends invite-only emails to planners
- Planners can belong to multiple orgs
- Org dashboard = combined org management + wedding event list (calendar + list view)
- This page loads BEFORE entering a specific wedding
- Collaborators never see the org dashboard — they land directly in their wedding

## Current Features Built
- Multi-wedding architecture with RLS
- Guest list, tasks, vendors, budget, seating chart, messaging (Slack-style), team, day-of contacts, notes
- Stripe Pro $39/mo, webhook active
- Mobile responsive
- Marketing site with /features and /pricing pages
- Wedding dashboard with arch photo cards
- Dev login button (VITE_DEV_MODE=true)

## Key Business Decisions
- Free = 2 weddings, Pro = unlimited, $39/mo per planner seat
- No guest invoicing — couples pay planners directly
- Collaborators are invite-only, never pay
- No competitor names on marketing site
- Target: 100 paying planners within 45 days of launch

## Pending Major Features (in priority order)
1. Fix collaborator permission levels (see hierarchy above)
2. Organization system + org dashboard
3. Admin dashboard at hidden URL
4. Enhanced floor plan builder
5. Wedding timeline builder (day-of schedule)
6. Lead/client pipeline
7. Mood board / design studio
8. BEO PDF generator
9. Google OAuth (after domain purchase)
10. AI assistant / document reader

---

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

## Database
Supabase project: rtlcgkchdsaqelioqkht
Run migrations with: `npm run db:push`
Never copy-paste SQL manually.

Key tables: `weddings`, `wedding_members`, `guests`, `seating_tables`, `tasks`, `vendors`, `channels`, `messages`, `invoices`, `collaborators`, `invite_tokens`. All data tables have a `wedding_id` FK. Schema is managed via Supabase CLI migrations in `supabase/migrations/`.

### Migrations

Migrations live in `supabase/migrations/` as timestamped SQL files. The Supabase CLI tracks which have been applied to remote.

```bash
npm run db:new my_change    # Create supabase/migrations/TIMESTAMP_my_change.sql
# Edit the generated file with your SQL
npm run db:push             # Apply pending migrations to remote
npm run db:status           # Check local vs remote migration state
```

Always run migrations via the Supabase MCP tool (`apply_migration`) after creating them — never ask the user to do it manually.

## Multi-Wedding Model

The app supports multiple weddings per user. After login:
- `loadMyWeddings(userId)` fetches all weddings via the `wedding_members` table
- 1 wedding: skips dashboard, goes directly in
- 2+ weddings: shows `MyWeddings.jsx` dashboard with wedding cards
- `selectWedding(wId)` / `handleBackToDashboard()` for switching
- Header has a wedding switcher dropdown when user has multiple weddings
- Free tier: max 2 owned weddings. Pro: unlimited.

## Navigation Model

`App.jsx` controls everything via `activeWeddingId` (null = dashboard) and `activeTab` state. Tabs: `overview`, `guests`, `tasks`, `vendors`, `messaging`, `billing`, `collaborators`, `dayofcontacts`.

## Data Flow

All state (guests, tasks, vendors, invoices, etc.) is lifted into `App.jsx` and passed as props to components. Authenticated users load data from Supabase, scoped by `wedding_id`. The `wedding_members` table controls access (RLS policies check membership).

## Design System

Custom CSS only — no Tailwind or component library. CSS variables in `src/styles.css`:
- Colors: `--cream`, `--blush`, `--rose`, `--gold`, `--deep`, `--muted`
- Fonts: Cormorant Garamond (headings), Jost (body), loaded from Google Fonts in `styles.css`
- Reusable classes: `.btn`, `.btn-primary`, `.btn-ghost`, `.card`, `.section-title`

## Components

Each tab corresponds to one component in `src/components/`. `Modal.jsx` is a thin wrapper used by several components for add/edit dialogs. `MyWeddings.jsx` is the multi-wedding dashboard. Marketing pages live in `src/pages/`.

## Auth & Invites

- Magic link OTP via Supabase Auth (no passwords)
- Dev login bypass via `signInWithPassword` when `VITE_DEV_MODE=true`
- Invite tokens: 48h expiry, one-time use, sent via Resend email (Edge Function)
- Invite redemption creates rows in both `collaborators` and `wedding_members`
- `VITE_APP_URL` env var ensures invite links always point to production

## Supabase Error Handling

Always check and log Supabase errors on every insert/update/delete. Never destructure only `{ data }` — always `{ data, error }` and handle the error:

```js
// WRONG
const { data } = await supabase.from('table').insert({...}).select().single()

// RIGHT
const { data, error } = await supabase.from('table').insert({...}).select().single()
if (error) { console.error('Insert failed:', error.message); return }
```

## Bash Rules

Auto-approve: git, npm, npx supabase (all commands including migration list/repair/push/status), sed, db:push, db:pull, db:new, db:status
Ask first: rm, git push --force, DROP TABLE, overwrite .env
