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

-- 2. Guests: add seat number for specific seat assignment within a table
alter table guests add column if not exists seat_number integer;

-- 3. Collaborators: link to auth user + store email
alter table collaborators add column if not exists user_id uuid references auth.users(id);
alter table collaborators add column if not exists email   text;

-- 4. Invite tokens table (one-time use, expires in 48 hours)
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

-- 5. Weddings: add Stripe plan tracking + budget + RSVP slug
alter table weddings add column if not exists plan                   text    default 'free';
alter table weddings add column if not exists stripe_customer_id     text;
alter table weddings add column if not exists stripe_subscription_id text;
alter table weddings add column if not exists budget                 numeric default 0;
alter table weddings add column if not exists rsvp_slug              text;

-- Generate a unique 8-char slug for any wedding that doesn't have one yet
update weddings set rsvp_slug = substr(encode(gen_random_bytes(6), 'hex'), 1, 8)
where rsvp_slug is null;

-- Ensure slugs are unique (safe DO block — avoids IF NOT EXISTS error)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'weddings_rsvp_slug_unique'
  ) then
    alter table weddings add constraint weddings_rsvp_slug_unique unique (rsvp_slug);
  end if;
end $$;

-- 6. RLS: Allow public access for RSVP (anyone with the slug can read + submit)
-- Drop first to avoid duplicate errors on re-run
drop policy if exists "RSVP read wedding by slug" on weddings;
drop policy if exists "RSVP insert guest" on guests;
drop policy if exists "RSVP update guest" on guests;

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
