-- The Worker writes with the service_role key, which bypasses RLS but still
-- needs ordinary table privileges. Grant them explicitly, plus defaults for
-- tables added later.

grant usage on schema public to service_role;
grant all on table public.sessions to service_role;
grant all on table public.turns to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
