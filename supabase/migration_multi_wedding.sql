-- ============================================================
-- Vow & Venue — Multi-Wedding Migration
-- Run this in Supabase → SQL Editor → New Query
-- AFTER running the original migration.sql
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- 1. wedding_members — access-control table for multi-wedding
create table if not exists wedding_members (
  id         uuid        default gen_random_uuid() primary key,
  wedding_id uuid        references weddings(id) on delete cascade not null,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  role       text        not null default 'viewer',
  created_at timestamptz default now(),
  unique(wedding_id, user_id)
);

alter table wedding_members enable row level security;

-- 2. RLS policies for wedding_members
drop policy if exists "wm_select" on wedding_members;
drop policy if exists "wm_insert" on wedding_members;
drop policy if exists "wm_delete" on wedding_members;

-- Users can read their own memberships
create policy "wm_select" on wedding_members
  for select using (auth.uid() = user_id);

-- Owners/planners can add members, or a user can insert themselves as owner
create policy "wm_insert" on wedding_members
  for insert with check (
    (auth.uid() = user_id and role = 'owner')
    or exists (
      select 1 from wedding_members wm
      where wm.wedding_id = wedding_members.wedding_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'planner')
    )
  );

-- Owners can remove members
create policy "wm_delete" on wedding_members
  for delete using (
    exists (
      select 1 from wedding_members wm
      where wm.wedding_id = wedding_members.wedding_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

-- 3. Update RLS on data tables to use wedding_members for access
--    (keep existing RSVP public policies intact)

-- ── guests ──
drop policy if exists "guests_select_member" on guests;
drop policy if exists "guests_insert_member" on guests;
drop policy if exists "guests_update_member" on guests;
drop policy if exists "guests_delete_member" on guests;

create policy "guests_select_member" on guests
  for select using (
    exists (select 1 from wedding_members wm where wm.wedding_id = guests.wedding_id and wm.user_id = auth.uid())
    or exists (select 1 from weddings w where w.id = guests.wedding_id and w.rsvp_slug is not null)
  );

create policy "guests_insert_member" on guests
  for insert with check (
    exists (select 1 from wedding_members wm where wm.wedding_id = guests.wedding_id and wm.user_id = auth.uid())
    or exists (select 1 from weddings w where w.id = guests.wedding_id and w.rsvp_slug is not null)
  );

create policy "guests_update_member" on guests
  for update using (
    exists (select 1 from wedding_members wm where wm.wedding_id = guests.wedding_id and wm.user_id = auth.uid())
    or true  -- keep existing open RSVP update policy
  );

create policy "guests_delete_member" on guests
  for delete using (
    exists (select 1 from wedding_members wm where wm.wedding_id = guests.wedding_id and wm.user_id = auth.uid())
  );

-- ── seating_tables ──
drop policy if exists "tables_select_member" on seating_tables;
drop policy if exists "tables_insert_member" on seating_tables;
drop policy if exists "tables_update_member" on seating_tables;
drop policy if exists "tables_delete_member" on seating_tables;

create policy "tables_select_member" on seating_tables
  for select using (
    exists (select 1 from wedding_members wm where wm.wedding_id = seating_tables.wedding_id and wm.user_id = auth.uid())
  );
create policy "tables_insert_member" on seating_tables
  for insert with check (
    exists (select 1 from wedding_members wm where wm.wedding_id = seating_tables.wedding_id and wm.user_id = auth.uid())
  );
create policy "tables_update_member" on seating_tables
  for update using (
    exists (select 1 from wedding_members wm where wm.wedding_id = seating_tables.wedding_id and wm.user_id = auth.uid())
  );
create policy "tables_delete_member" on seating_tables
  for delete using (
    exists (select 1 from wedding_members wm where wm.wedding_id = seating_tables.wedding_id and wm.user_id = auth.uid())
  );

-- ── tasks ──
drop policy if exists "tasks_select_member" on tasks;
drop policy if exists "tasks_insert_member" on tasks;
drop policy if exists "tasks_update_member" on tasks;
drop policy if exists "tasks_delete_member" on tasks;

create policy "tasks_select_member" on tasks
  for select using (
    exists (select 1 from wedding_members wm where wm.wedding_id = tasks.wedding_id and wm.user_id = auth.uid())
  );
create policy "tasks_insert_member" on tasks
  for insert with check (
    exists (select 1 from wedding_members wm where wm.wedding_id = tasks.wedding_id and wm.user_id = auth.uid())
  );
create policy "tasks_update_member" on tasks
  for update using (
    exists (select 1 from wedding_members wm where wm.wedding_id = tasks.wedding_id and wm.user_id = auth.uid())
  );
create policy "tasks_delete_member" on tasks
  for delete using (
    exists (select 1 from wedding_members wm where wm.wedding_id = tasks.wedding_id and wm.user_id = auth.uid())
  );

-- ── vendors ──
drop policy if exists "vendors_select_member" on vendors;
drop policy if exists "vendors_insert_member" on vendors;
drop policy if exists "vendors_update_member" on vendors;
drop policy if exists "vendors_delete_member" on vendors;

create policy "vendors_select_member" on vendors
  for select using (
    exists (select 1 from wedding_members wm where wm.wedding_id = vendors.wedding_id and wm.user_id = auth.uid())
  );
create policy "vendors_insert_member" on vendors
  for insert with check (
    exists (select 1 from wedding_members wm where wm.wedding_id = vendors.wedding_id and wm.user_id = auth.uid())
  );
create policy "vendors_update_member" on vendors
  for update using (
    exists (select 1 from wedding_members wm where wm.wedding_id = vendors.wedding_id and wm.user_id = auth.uid())
  );
create policy "vendors_delete_member" on vendors
  for delete using (
    exists (select 1 from wedding_members wm where wm.wedding_id = vendors.wedding_id and wm.user_id = auth.uid())
  );

-- ── channels ──
drop policy if exists "channels_select_member" on channels;
drop policy if exists "channels_insert_member" on channels;
drop policy if exists "channels_delete_member" on channels;

create policy "channels_select_member" on channels
  for select using (
    exists (select 1 from wedding_members wm where wm.wedding_id = channels.wedding_id and wm.user_id = auth.uid())
  );
create policy "channels_insert_member" on channels
  for insert with check (
    exists (select 1 from wedding_members wm where wm.wedding_id = channels.wedding_id and wm.user_id = auth.uid())
  );
create policy "channels_delete_member" on channels
  for delete using (
    exists (select 1 from wedding_members wm where wm.wedding_id = channels.wedding_id and wm.user_id = auth.uid())
  );

-- ── invoices ──
drop policy if exists "invoices_select_member" on invoices;
drop policy if exists "invoices_insert_member" on invoices;
drop policy if exists "invoices_update_member" on invoices;
drop policy if exists "invoices_delete_member" on invoices;

create policy "invoices_select_member" on invoices
  for select using (
    exists (select 1 from wedding_members wm where wm.wedding_id = invoices.wedding_id and wm.user_id = auth.uid())
  );
create policy "invoices_insert_member" on invoices
  for insert with check (
    exists (select 1 from wedding_members wm where wm.wedding_id = invoices.wedding_id and wm.user_id = auth.uid())
  );
create policy "invoices_update_member" on invoices
  for update using (
    exists (select 1 from wedding_members wm where wm.wedding_id = invoices.wedding_id and wm.user_id = auth.uid())
  );
create policy "invoices_delete_member" on invoices
  for delete using (
    exists (select 1 from wedding_members wm where wm.wedding_id = invoices.wedding_id and wm.user_id = auth.uid())
  );

-- ── collaborators ──
drop policy if exists "collabs_select_member" on collaborators;
drop policy if exists "collabs_insert_member" on collaborators;
drop policy if exists "collabs_update_member" on collaborators;
drop policy if exists "collabs_delete_member" on collaborators;

create policy "collabs_select_member" on collaborators
  for select using (
    exists (select 1 from wedding_members wm where wm.wedding_id = collaborators.wedding_id and wm.user_id = auth.uid())
  );
create policy "collabs_insert_member" on collaborators
  for insert with check (
    exists (select 1 from wedding_members wm where wm.wedding_id = collaborators.wedding_id and wm.user_id = auth.uid())
  );
create policy "collabs_update_member" on collaborators
  for update using (
    exists (select 1 from wedding_members wm where wm.wedding_id = collaborators.wedding_id and wm.user_id = auth.uid())
    or true  -- allow upsert during invite redemption
  );
create policy "collabs_delete_member" on collaborators
  for delete using (
    exists (select 1 from wedding_members wm where wm.wedding_id = collaborators.wedding_id and wm.user_id = auth.uid())
  );

-- ── weddings ── (update to allow members to read, keep RSVP slug read)
drop policy if exists "weddings_select_member" on weddings;
drop policy if exists "weddings_insert_auth" on weddings;
drop policy if exists "weddings_update_member" on weddings;

create policy "weddings_select_member" on weddings
  for select using (
    auth.uid() = user_id
    or exists (select 1 from wedding_members wm where wm.wedding_id = id and wm.user_id = auth.uid())
    or rsvp_slug is not null  -- keep public RSVP access
  );

create policy "weddings_insert_auth" on weddings
  for insert with check (auth.uid() = user_id);

create policy "weddings_update_member" on weddings
  for update using (
    auth.uid() = user_id
    or exists (select 1 from wedding_members wm where wm.wedding_id = id and wm.user_id = auth.uid() and wm.role in ('owner', 'planner'))
  );

-- 4. Update invite_tokens INSERT to allow planners too
drop policy if exists "invite_tokens_insert" on invite_tokens;
create policy "invite_tokens_insert" on invite_tokens
  for insert with check (
    auth.uid() = (select user_id from weddings where id = wedding_id)
    or exists (
      select 1 from wedding_members wm
      where wm.wedding_id = invite_tokens.wedding_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'planner')
    )
  );

-- 5. Backfill: existing wedding owners → wedding_members
insert into wedding_members (wedding_id, user_id, role)
select id, user_id, 'owner'
from weddings
where user_id is not null
on conflict (wedding_id, user_id) do nothing;

-- Backfill: existing collaborators with user_id → wedding_members
insert into wedding_members (wedding_id, user_id, role)
select wedding_id, user_id,
  case
    when lower(role) like '%planner%' then 'planner'
    when lower(role) in ('bride', 'groom') then 'family'
    when lower(role) like '%vendor%' then 'vendor'
    else 'viewer'
  end
from collaborators
where user_id is not null
on conflict (wedding_id, user_id) do nothing;
