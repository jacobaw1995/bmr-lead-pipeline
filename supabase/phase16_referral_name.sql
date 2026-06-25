-- Phase 16: referral contact name when lead source is Referral
alter table leads
  add column if not exists referral_name text;