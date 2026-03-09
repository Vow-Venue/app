-- ============================================================
-- Vow & Venue — Baseline Schema
-- Auto-generated from remote database state on 2026-03-09
-- This migration is marked as "applied" — it won't re-run.
-- ============================================================

-- ── weddings ──────────────────────────────────────────────────
create table if not exists weddings (
  id                     uuid        default gen_random_uuid() primary key,
  user_id                uuid        references auth.users(id) not null unique,
  partner1               text        default 'Partner 1' not null,
  partner2               text        default 'Partner 2' not null,
  wedding_date           date        default '2026-06-14' not null,
  created_at             timestamptz default now(),
  setup_complete         boolean     default false,
  plan                   text        default 'free',
  stripe_customer_id     text,
  stripe_subscription_id text,
  budget                 numeric     default 0,
  rsvp_slug              text        unique
);

alter table weddings enable row level security;

create policy "Users manage own wedding" on weddings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "RSVP read wedding by slug" on weddings
  for select using (rsvp_slug is not null);

create policy "weddings_insert_auth" on weddings
  for insert with check (auth.uid() = user_id);

create policy "weddings_select_member" on weddings
  for select using (
    auth.uid() = user_id
    or exists (select 1 from wedding_members wm where wm.wedding_id = id and wm.user_id = auth.uid())
    or rsvp_slug is not null
  );

create policy "weddings_update_member" on weddings
  for update using (
    auth.uid() = user_id
    or exists (
      select 1 from wedding_members wm
      where wm.wedding_id = id and wm.user_id = auth.uid()
        and wm.role in ('owner', 'planner')
    )
  );

-- ── wedding_members ───────────────────────────────────────────
create table if not exists wedding_members (
  id         uuid        default gen_random_uuid() primary key,
  wedding_id uuid        references weddings(id) on delete cascade not null,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  role       text        default 'viewer' not null,
  created_at timestamptz default now(),
  unique(wedding_id, user_id)
);

alter table wedding_members enable row level security;

create policy "wm_select" on wedding_members
  for select using (auth.uid() = user_id);

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

create policy "wm_delete" on wedding_members
  for delete using (
    exists (
      select 1 from wedding_members wm
      where wm.wedding_id = wedding_members.wedding_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

-- ── seating_tables ────────────────────────────────────────────
create table if not exists seating_tables (
  id         uuid        default gen_random_uuid() primary key,
  wedding_id uuid        references weddings(id) not null,
  name       text        not null,
  shape      text        default 'round',
  x          integer     default 100,
  y          integer     default 100,
  capacity   integer     default 8
);

alter table seating_tables enable row level security;

create policy "Users manage own seating tables" on seating_tables
  for all using (
    wedding_id in (select id from weddings where user_id = auth.uid())
  ) with check (
    wedding_id in (select id from weddings where user_id = auth.uid())
  );

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

-- ── guests ────────────────────────────────────────────────────
create table if not exists guests (
  id          uuid        default gen_random_uuid() primary key,
  wedding_id  uuid        references weddings(id) not null,
  name        text        not null,
  email       text,
  rsvp        text        default 'pending',
  dietary     text,
  guest_role  text,
  table_id    uuid        references seating_tables(id) on delete set null,
  created_at  timestamptz default now(),
  seat_number integer
);

alter table guests enable row level security;

create policy "Users manage own guests" on guests
  for all using (
    wedding_id in (select id from weddings where user_id = auth.uid())
  ) with check (
    wedding_id in (select id from weddings where user_id = auth.uid())
  );

create policy "RSVP insert guest" on guests
  for insert with check (
    exists (select 1 from weddings where id = wedding_id and rsvp_slug is not null)
  );

create policy "RSVP update guest" on guests
  for update using (true);

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
    or true
  );
create policy "guests_delete_member" on guests
  for delete using (
    exists (select 1 from wedding_members wm where wm.wedding_id = guests.wedding_id and wm.user_id = auth.uid())
  );

-- ── tasks ─────────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid        default gen_random_uuid() primary key,
  wedding_id  uuid        references weddings(id) not null,
  title       text        not null,
  done        boolean     default false,
  due_date    date,
  assigned_to text,
  priority    text        default 'medium',
  created_at  timestamptz default now()
);

alter table tasks enable row level security;

create policy "Users manage own tasks" on tasks
  for all using (
    wedding_id in (select id from weddings where user_id = auth.uid())
  ) with check (
    wedding_id in (select id from weddings where user_id = auth.uid())
  );

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

-- ── vendors ───────────────────────────────────────────────────
create table if not exists vendors (
  id         uuid        default gen_random_uuid() primary key,
  wedding_id uuid        references weddings(id) not null,
  name       text        not null,
  role       text,
  phone      text,
  email      text,
  notes      text,
  created_at timestamptz default now()
);

alter table vendors enable row level security;

create policy "Users manage own vendors" on vendors
  for all using (
    wedding_id in (select id from weddings where user_id = auth.uid())
  ) with check (
    wedding_id in (select id from weddings where user_id = auth.uid())
  );

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

-- ── channels ──────────────────────────────────────────────────
create table if not exists channels (
  id         uuid default gen_random_uuid() primary key,
  wedding_id uuid references weddings(id) not null,
  name       text not null,
  type       text default 'channel'
);

alter table channels enable row level security;

create policy "Users manage own channels" on channels
  for all using (
    wedding_id in (select id from weddings where user_id = auth.uid())
  ) with check (
    wedding_id in (select id from weddings where user_id = auth.uid())
  );

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

-- ── messages ──────────────────────────────────────────────────
create table if not exists messages (
  id          uuid        default gen_random_uuid() primary key,
  channel_id  uuid        references channels(id) not null,
  sender_id   text        not null,
  sender_name text        not null,
  body        text        not null,
  created_at  timestamptz default now()
);

alter table messages enable row level security;

create policy "Users manage own messages" on messages
  for all using (
    channel_id in (
      select id from channels where wedding_id in (
        select id from weddings where user_id = auth.uid()
      )
    )
  ) with check (
    channel_id in (
      select id from channels where wedding_id in (
        select id from weddings where user_id = auth.uid()
      )
    )
  );

-- ── invoices ──────────────────────────────────────────────────
create table if not exists invoices (
  id             uuid        default gen_random_uuid() primary key,
  wedding_id     uuid        references weddings(id) not null,
  invoice_number text,
  vendor_name    text        not null,
  amount         numeric     default 0 not null,
  due_date       date,
  status         text        default 'unpaid',
  notes          text,
  file_url       text,
  file_name      text,
  created_at     timestamptz default now()
);

alter table invoices enable row level security;

create policy "Users manage own invoices" on invoices
  for all using (
    wedding_id in (select id from weddings where user_id = auth.uid())
  ) with check (
    wedding_id in (select id from weddings where user_id = auth.uid())
  );

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

-- ── collaborators ─────────────────────────────────────────────
create table if not exists collaborators (
  id         uuid        default gen_random_uuid() primary key,
  wedding_id uuid        references weddings(id) not null,
  name       text        not null,
  role       text,
  access     text        default 'view',
  created_at timestamptz default now(),
  user_id    uuid        references auth.users(id),
  email      text
);

alter table collaborators enable row level security;

create policy "Users manage own collaborators" on collaborators
  for all using (
    wedding_id in (select id from weddings where user_id = auth.uid())
  ) with check (
    wedding_id in (select id from weddings where user_id = auth.uid())
  );

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

-- ── invite_tokens ─────────────────────────────────────────────
create table if not exists invite_tokens (
  id         uuid        default gen_random_uuid() primary key,
  token      text        unique not null default encode(gen_random_bytes(16), 'hex'),
  wedding_id uuid        references weddings(id) on delete cascade not null,
  email      text        not null,
  name       text        default '',
  role       text        default '',
  access     text        default 'view',
  used       boolean     default false,
  created_at timestamptz default now()
);

alter table invite_tokens enable row level security;

create policy "invite_tokens_select" on invite_tokens
  for select using (true);

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

create policy "invite_tokens_update" on invite_tokens
  for update using (true);
