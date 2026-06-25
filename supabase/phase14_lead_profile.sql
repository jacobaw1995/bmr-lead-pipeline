-- Run in Supabase SQL Editor
-- Expanded lead profile: billing vs service address, contact, project fields

alter table leads
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists company_name text,
  add column if not exists billing_street_address text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_zip text,
  add column if not exists service_street_address text,
  add column if not exists service_city text,
  add column if not exists service_state text,
  add column if not exists service_zip text,
  add column if not exists cell_phone text,
  add column if not exists secondary_phone text,
  add column if not exists existing_roof_type text,
  add column if not exists roof_type_requested text,
  add column if not exists remodel_or_new_construction text,
  add column if not exists homeowner_or_contractor text;

-- Backfill from legacy columns
update leads
set
  first_name = coalesce(
    first_name,
    nullif(trim(split_part(name, ' ', 1)), ''),
    name
  ),
  last_name = coalesce(
    last_name,
    nullif(trim(substring(name from position(' ' in name) + 1)), ''),
    ''
  ),
  cell_phone = coalesce(cell_phone, phone),
  service_street_address = coalesce(service_street_address, street_address),
  service_city = coalesce(service_city, city),
  service_state = coalesce(service_state, state),
  service_zip = coalesce(service_zip, zip)
where name is not null;

create index if not exists idx_leads_company on leads(company_name);
create index if not exists idx_leads_service_city on leads(service_city);
create index if not exists idx_leads_service_state on leads(service_state);