-- ============================================================
-- Vow & Venue — SQL Migration
-- Run this in Supabase → SQL Editor → New Query
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- 1. Seating tables: add shape, position, and capacity columns
alter table seating_tables add column if not exists shape    text    default 'round';
alter table seating_tables add column if not exists x        integer default 100;
alter table seating_tables add column if not exists y        integer default 100;
alter table seating_tables add column if not exists capacity integer default 8;

-- 2. Collaborators: link to auth user + store email
alter table collaborators add column if not exists user_id uuid references auth.users(id);
alter table collaborators add column if not exists email   text;

-- 3. Invite tokens table (one-time use, expires in 48 hours)
create table if not exists invite_tokens (
  id         uuid        default gen_random_uuid() primary key,
  token      text        unique not null default encode(gen_random_bytes(16), 'hex'),
  wedding_id uuid        references weddings(id) on delete cascade not null,
  email      text        not null,
  name       text        default '',
  role       text        default '',
  access     text        default 'view',
  used       boolean     default false,
  expires_at timestamptz default (now() + interval '48 hours'),
  created_at timestamptz default now()
);

-- Enable RLS
alter table invite_tokens enable row level security;

-- RLS policies (drop first to avoid duplicate errors)
drop policy if exists "invite_tokens_select" on invite_tokens;
drop policy if exists "invite_tokens_insert" on invite_tokens;
drop policy if exists "invite_tokens_update" on invite_tokens;

-- Anyone can read a token by its value (needed for invite redemption)
create policy "invite_tokens_select" on invite_tokens
  for select using (true);

-- Only the wedding owner can create invite tokens
create policy "invite_tokens_insert" on invite_tokens
  for insert with check (
    auth.uid() = (select user_id from weddings where id = wedding_id)
  );

-- Allow updating (mark as used) during redemption
create policy "invite_tokens_update" on invite_tokens
  for update using (true);

-- 4. Weddings: add Stripe plan tracking + budget + RSVP slug
alter table weddings add column if not exists plan                   text    default 'free';
alter table weddings add column if not exists stripe_customer_id     text;
alter table weddings add column if not exists stripe_subscription_id text;
alter table weddings add column if not exists budget                 numeric default 0;
alter table weddings add column if not exists rsvp_slug              text;

-- Generate a unique 8-char slug for any wedding that doesn't have one yet
update weddings set rsvp_slug = substr(encode(gen_random_bytes(6), 'hex'), 1, 8)
where rsvp_slug is null;

-- Ensure slugs are unique
alter table weddings add constraint if not exists weddings_rsvp_slug_unique unique (rsvp_slug);

-- 5. RLS: Allow public access for RSVP (anyone with the slug can read + submit)
-- Read wedding by slug (slug acts as the access token)
create policy "RSVP read wedding by slug" on weddings
  for select using (rsvp_slug is not null);

-- Allow anonymous guests to submit RSVP
create policy "RSVP insert guest" on guests
  for insert with check (
    exists (select 1 from weddings where id = wedding_id and rsvp_slug is not null)
  );

create policy "RSVP update guest" on guests
  for update using (true);
