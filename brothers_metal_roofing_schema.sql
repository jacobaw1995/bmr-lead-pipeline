-- ============================================================
-- BROTHERS METAL ROOFING — LEAD PIPELINE SCHEMA
-- Built on Supabase (Postgres + Auth + RLS)
-- Designed to be extended later by a sister "project management"
-- app that picks up where a closed-won lead leaves off.
-- ============================================================

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------

create type user_role as enum ('salesman', 'manager');

create type lead_source as enum ('webhook', 'manual', 'referral');

create type lead_stage as enum (
  'lead_captured',
  'qualified',
  'proposal_sent',
  'negotiating',
  'closed'
);

create type lead_status as enum ('active', 'closed_won', 'closed_lost');

create type activity_action as enum (
  'created',
  'stage_changed',
  'status_changed',
  'reassigned',
  'value_set',
  'edited'
);

-- ------------------------------------------------------------
-- PROFILES
-- Extends auth.users. Shared identity table — the future
-- project-management add-on reads from this same table.
-- ------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'salesman',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- LEADS
-- The core pipeline table. lead.id is the anchor a future
-- `projects` table will point back to via project.lead_id.
-- Never recycle or reuse lead ids.
-- ------------------------------------------------------------

create table leads (
  id uuid primary key default gen_random_uuid(),

  -- contact info
  name text not null,
  phone text,
  email text,
  address text,

  -- pipeline state
  source lead_source not null default 'manual',
  stage lead_stage not null default 'lead_captured',
  status lead_status not null default 'active',

  -- money — null until a proposal exists
  value numeric(12,2),

  -- ownership
  owner_id uuid references profiles(id),

  -- loss tracking (any stage can be marked lost)
  lost_reason text,

  -- forward-compatibility hook for the project-management add-on.
  -- flips to true once a project record has been created from this lead.
  closed_won_project_created boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index idx_leads_owner on leads(owner_id);
create index idx_leads_stage on leads(stage);
create index idx_leads_status on leads(status);
create index idx_leads_created_at on leads(created_at);

-- ------------------------------------------------------------
-- LEAD NOTES
-- Anyone can add a note to any lead. Full audit trail by
-- author and timestamp — never a single overwritten text field.
-- ------------------------------------------------------------

create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  author_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_lead_notes_lead on lead_notes(lead_id);

-- ------------------------------------------------------------
-- LEAD ACTIVITY
-- The audit trail for stage moves, edits, reassignments.
-- Separate from notes because this is system-tracked,
-- not user-authored commentary.
-- ------------------------------------------------------------

create table lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  actor_id uuid not null references profiles(id),
  action activity_action not null,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index idx_lead_activity_lead on lead_activity(lead_id);

-- ------------------------------------------------------------
-- updated_at AUTO-TOUCH TRIGGER
-- ------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_touch_updated_at
before update on leads
for each row
execute function touch_updated_at();

-- ------------------------------------------------------------
-- HELPER: current user's role
-- Used inside RLS policies — avoids recursive subqueries.
-- ------------------------------------------------------------

create or replace function is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table profiles enable row level security;
alter table leads enable row level security;
alter table lead_notes enable row level security;
alter table lead_activity enable row level security;

-- PROFILES: everyone can see all profiles (needed for "owner" chips on cards)
create policy "profiles_select_all" on profiles
  for select using (true);

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- LEADS: full visibility for everyone (the whole point of the open field view)
create policy "leads_select_all" on leads
  for select using (true);

-- LEADS: only the owning salesman or a manager can change stage/status/value
create policy "leads_update_owner_or_manager" on leads
  for update using (
    owner_id = auth.uid() or is_manager()
  );

-- LEADS: any authenticated user can create a lead (manual entry)
create policy "leads_insert_authenticated" on leads
  for insert with check (auth.uid() is not null);

-- LEAD NOTES: anyone can read all notes
create policy "lead_notes_select_all" on lead_notes
  for select using (true);

-- LEAD NOTES: anyone can add a note (collaborative intel gathering)
create policy "lead_notes_insert_authenticated" on lead_notes
  for insert with check (author_id = auth.uid());

-- LEAD ACTIVITY: anyone can read the audit trail
create policy "lead_activity_select_all" on lead_activity
  for select using (true);

-- LEAD ACTIVITY: system/app inserts on behalf of the acting user
create policy "lead_activity_insert_authenticated" on lead_activity
  for insert with check (actor_id = auth.uid());

-- ------------------------------------------------------------
-- REAL-TIME STATS — RPC FUNCTIONS
-- Calculated on the fly, scoped to the calling user, per
-- Jacob's instruction that the scoreboard never goes stale.
-- ------------------------------------------------------------

-- Deals closed-won this calendar month, for the calling user
create or replace function my_closes_this_month()
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
    and closed_at >= date_trunc('month', now());
$$;

-- Win rate: closed_won / (closed_won + closed_lost), all-time, for the calling user
create or replace function my_win_rate()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select case when total = 0 then 0
    else round((won::numeric / total) * 100, 1)
  end
  from (
    select
      count(*) filter (where status = 'closed_won') as won,
      count(*) filter (where status in ('closed_won','closed_lost')) as total
    from leads
    where owner_id = auth.uid()
  ) t;
$$;

-- Average days in pipeline for closed-won leads, for the calling user
create or replace function my_avg_cycle_days()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(round(avg(extract(epoch from (closed_at - created_at)) / 86400), 1), 0)
  from leads
  where owner_id = auth.uid()
    and status = 'closed_won'
    and closed_at is not null;
$$;

-- Open pipeline value (only counts leads at proposal_sent or beyond,
-- since value is null before a proposal exists), for the calling user
create or replace function my_open_pipeline_value()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(value), 0)
  from leads
  where owner_id = auth.uid()
    and status = 'active'
    and stage in ('proposal_sent', 'negotiating')
    and value is not null;
$$;

-- Active lead count, for the calling user
create or replace function my_active_lead_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from leads
  where owner_id = auth.uid()
    and status = 'active';
$$;

-- ------------------------------------------------------------
-- FORWARD-COMPATIBILITY NOTES (for future project-management add-on)
-- ------------------------------------------------------------
-- 1. When the sister app ships, create a `projects` table with a
--    `lead_id uuid references leads(id)` column.
-- 2. When a project is created from a closed_won lead, set
--    leads.closed_won_project_created = true so this app's UI can
--    show a "Project Started →" badge instead of a dead end.
-- 3. profiles stays the single shared identity/auth table across
--    both apps — do not create a second users table.
-- 4. lead_activity and lead_notes are already relational (not JSON
--    blobs), so the project app can read this same history without
--    a data migration.
