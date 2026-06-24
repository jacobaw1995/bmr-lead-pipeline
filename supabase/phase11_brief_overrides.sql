-- Run in Supabase SQL Editor
-- Phase 11: snooze / dismiss coach's calls per user

create table brief_item_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_key text not null,
  hidden_until timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_key)
);

create index idx_brief_overrides_user on brief_item_overrides(user_id, hidden_until);

alter table brief_item_overrides enable row level security;

create policy "brief_overrides_select_own" on brief_item_overrides
  for select using (user_id = auth.uid());

create policy "brief_overrides_insert_own" on brief_item_overrides
  for insert with check (user_id = auth.uid());

create policy "brief_overrides_update_own" on brief_item_overrides
  for update using (user_id = auth.uid());

create policy "brief_overrides_delete_own" on brief_item_overrides
  for delete using (user_id = auth.uid());