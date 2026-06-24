-- Run in Supabase SQL Editor
-- Phase 13: free-text lead sources + per-user theme preference

alter table profiles
  add column if not exists theme_preference text not null default 'dark'
    check (theme_preference in ('light', 'dark'));

-- Convert lead source from enum to free text (supports custom sources)
alter table leads alter column source drop default;

alter table leads
  alter column source type text using (
    case source::text
      when 'manual' then 'Phone Call'
      when 'referral' then 'Referral'
      when 'webhook' then 'Website'
      else source::text
    end
  );

alter table leads alter column source set default 'Phone Call';

drop type if exists lead_source;