-- Run in Supabase SQL Editor
-- Optional title per appointment (description uses existing notes column)

alter table lead_appointments
  add column if not exists title text;