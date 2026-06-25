-- Phase 15: Intake & site-visit checklists (feeds auto scope / proposal pipeline)
alter table leads
  add column if not exists intake_checklist jsonb not null default '{}'::jsonb;