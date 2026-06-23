-- Run in Supabase SQL Editor for Phase 5 (Coach's Office)
-- 1. Prior-month closes RPC for scoreboard delta
-- 2. Personal monthly close goal on profiles

-- Closes last calendar month (for "+2 vs last mo." comparison)
create or replace function my_closes_last_month()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from leads
  where owner_id = auth.uid()
    and status = 'closed_won'
    and closed_at >= date_trunc('month', now() - interval '1 month')
    and closed_at < date_trunc('month', now());
$$;

grant execute on function my_closes_last_month() to authenticated;

-- Personal monthly close goal (self-set in Coach's Office)
alter table profiles
  add column if not exists monthly_close_goal integer
  check (monthly_close_goal is null or monthly_close_goal > 0);