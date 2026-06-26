-- Phase 17: import batch history + manager lead delete

create table if not exists lead_import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid not null references profiles(id),
  filename text,
  row_count int not null default 0,
  imported_count int not null default 0,
  skipped_count int not null default 0,
  status text not null default 'active' check (status in ('active', 'undone')),
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by uuid references profiles(id)
);

create index if not exists idx_lead_import_batches_created
  on lead_import_batches(created_at desc);

alter table leads
  add column if not exists import_batch_id uuid references lead_import_batches(id) on delete set null;

create index if not exists idx_leads_import_batch
  on leads(import_batch_id)
  where import_batch_id is not null;

-- Managers may delete leads (cascades notes, activity, appointments)
drop policy if exists "leads_delete_manager" on leads;
create policy "leads_delete_manager" on leads
  for delete using (is_manager());

alter table lead_import_batches enable row level security;

drop policy if exists "import_batches_select_manager" on lead_import_batches;
create policy "import_batches_select_manager" on lead_import_batches
  for select using (is_manager());

drop policy if exists "import_batches_insert_manager" on lead_import_batches;
create policy "import_batches_insert_manager" on lead_import_batches
  for insert with check (is_manager() and imported_by = auth.uid());

drop policy if exists "import_batches_update_manager" on lead_import_batches;
create policy "import_batches_update_manager" on lead_import_batches
  for update using (is_manager());