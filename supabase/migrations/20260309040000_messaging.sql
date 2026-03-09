-- ── Messaging: Channel Members & RLS ─────────────────────────

-- 1. Channel members join table
create table if not exists channel_members (
  id         uuid        default gen_random_uuid() primary key,
  channel_id uuid        references channels(id) on delete cascade not null,
  user_id    text        not null,
  joined_at  timestamptz default now(),
  unique(channel_id, user_id)
);

alter table channel_members enable row level security;

-- 2. Add created_by to channels
alter table channels add column if not exists created_by text;

-- 3. Channel members RLS policies

create policy "cm_select" on channel_members
  for select using (
    exists (
      select 1 from channels c
      join wedding_members wm on wm.wedding_id = c.wedding_id
      where c.id = channel_members.channel_id
        and wm.user_id = auth.uid()
    )
  );

create policy "cm_insert" on channel_members
  for insert with check (
    exists (
      select 1 from channels c
      join wedding_members wm on wm.wedding_id = c.wedding_id
      where c.id = channel_members.channel_id
        and wm.user_id = auth.uid()
    )
  );

create policy "cm_delete" on channel_members
  for delete using (
    (
      exists (
        select 1 from channels c
        join wedding_members wm on wm.wedding_id = c.wedding_id
        where c.id = channel_members.channel_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'planner')
      )
    )
    or user_id = auth.uid()::text
  );

-- 4. Messages RLS policies for wedding members

drop policy if exists "messages_select_member" on messages;
drop policy if exists "messages_insert_member" on messages;

create policy "messages_select_member" on messages
  for select using (
    exists (
      select 1 from channels c
      join wedding_members wm on wm.wedding_id = c.wedding_id
      where c.id = messages.channel_id
        and wm.user_id = auth.uid()
    )
  );

create policy "messages_insert_member" on messages
  for insert with check (
    exists (
      select 1 from channels c
      join wedding_members wm on wm.wedding_id = c.wedding_id
      where c.id = messages.channel_id
        and wm.user_id = auth.uid()
    )
  );
