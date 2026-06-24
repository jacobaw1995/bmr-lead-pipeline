-- Run in Supabase SQL Editor
-- Phase 9: scheduled appointments, follow-up timestamps, conflict detection

create type appointment_type as enum ('inspection', 'site_survey');
create type appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');

create table lead_appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  appointment_type appointment_type not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 90,
  status appointment_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

create index idx_appointments_lead on lead_appointments(lead_id);
create index idx_appointments_owner_scheduled
  on lead_appointments(owner_id, scheduled_at)
  where status = 'scheduled';

alter table leads
  add column if not exists proposal_sent_at timestamptz,
  add column if not exists last_contacted_at timestamptz;

-- Backfill proposal_sent_at from activity trail where possible
update leads l
set proposal_sent_at = sub.first_sent
from (
  select lead_id, min(created_at) as first_sent
  from lead_activity
  where action = 'stage_changed'
    and to_value = 'proposal_sent'
  group by lead_id
) sub
where l.id = sub.lead_id
  and l.proposal_sent_at is null;

-- Returns true when the proposed window overlaps an existing scheduled appointment
create or replace function has_appointment_conflict(
  p_owner_id uuid,
  p_scheduled_at timestamptz,
  p_duration_minutes int default 90,
  p_exclude_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from lead_appointments a
    where a.owner_id = p_owner_id
      and a.status = 'scheduled'
      and (p_exclude_id is null or a.id <> p_exclude_id)
      and tstzrange(
            a.scheduled_at,
            a.scheduled_at + make_interval(mins => a.duration_minutes),
            '[)'
          )
          && tstzrange(
            p_scheduled_at,
            p_scheduled_at + make_interval(mins => p_duration_minutes),
            '[)'
          )
  );
$$;

grant execute on function has_appointment_conflict(uuid, timestamptz, int, uuid) to authenticated;

alter table lead_appointments enable row level security;

create policy "appointments_select_all" on lead_appointments
  for select using (true);

create policy "appointments_insert_owner_or_manager" on lead_appointments
  for insert with check (
    owner_id = auth.uid() or is_manager()
  );

create policy "appointments_update_owner_or_manager" on lead_appointments
  for update using (
    owner_id = auth.uid() or is_manager()
  );