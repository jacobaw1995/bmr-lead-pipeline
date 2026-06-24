-- Run in Supabase SQL Editor
-- Adds structured address fields + visual milestone timestamps

alter table leads
  add column if not exists street_address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text,
  add column if not exists inspection_scheduled_at timestamptz,
  add column if not exists roof_scope_ordered_at timestamptz,
  add column if not exists site_survey_complete_at timestamptz,
  add column if not exists quote_presented_at timestamptz;

-- Backfill street from legacy single address field
update leads
set street_address = address
where address is not null
  and street_address is null;

create index if not exists idx_leads_city on leads(city);
create index if not exists idx_leads_state on leads(state);
create index if not exists idx_leads_zip on leads(zip);