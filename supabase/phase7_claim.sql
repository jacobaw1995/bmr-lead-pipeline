-- Run in Supabase SQL Editor for Phase 7
-- Allows any authenticated user to claim an unassigned active lead

create or replace function claim_lead(p_lead_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update leads
  set owner_id = auth.uid()
  where id = p_lead_id
    and owner_id is null
    and status = 'active';

  return found;
end;
$$;

grant execute on function claim_lead(uuid) to authenticated;