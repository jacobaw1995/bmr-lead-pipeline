-- Run AFTER brothers_metal_roofing_schema.sql
-- Required for auth signup to work with the provided schema.

-- Auto-creates a profile when a new auth user signs up (bypasses RLS via security definer)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'salesman'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Safety net: creates profile on first login if the trigger was missed
create or replace function ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, email, role)
  select
    id,
    coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    email,
    'salesman'
  from auth.users
  where id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

grant execute on function ensure_profile() to authenticated;