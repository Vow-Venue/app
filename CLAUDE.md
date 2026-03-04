# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173)
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

No test runner is configured.

## Environment

Requires a `.env` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

See `.env.example` for the template.

## Architecture

**Vow & Venue** is a React 18 + Vite SPA for wedding planning. All state lives in `src/App.jsx` — there is no router or global state library.

### Navigation Model

`App.jsx` controls everything via `activeTab` state. Tabs: `overview`, `guests`, `tasks`, `vendors`, `messaging`, `billing`, `collaborators`, `day-of`. The `showLanding` flag gates the app behind a landing page (`src/components/LandingPage.jsx`).

### Data Flow

All state (guests, tasks, vendors, invoices, etc.) is lifted into `App.jsx` and passed as props to components. Data is initialized from seed constants defined at the top of `App.jsx`. **There is no persistence** — state resets on page refresh. Supabase client is initialized in `src/lib/supabase.js` but not yet wired to any component.

### Design System

Custom CSS only — no Tailwind or component library. CSS variables in `src/styles.css`:
- Colors: `--cream`, `--blush`, `--rose`, `--gold`, `--deep`, `--muted`
- Fonts: Cormorant Garamond (headings), Jost (body), loaded from Google Fonts in `styles.css`
- Reusable classes: `.btn`, `.btn-primary`, `.btn-ghost`, `.card`, `.section-title`

### Components

Each tab corresponds to one component in `src/components/`. `Modal.jsx` is a thin wrapper used by several components for add/edit dialogs.

### Future Integration Points

- Auth: `Header.jsx` has a placeholder "SIGN IN" button; a guest-mode banner is shown in `App.jsx`
- Database: All seed arrays (`SEED_GUESTS`, `SEED_TASKS`, etc.) in `App.jsx` are the intended Supabase table shapes
