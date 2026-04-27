-- DKD frontend-only cargo courier tracking patch
-- This SQL file is intentionally a no-op so patch bundles stay operationally consistent.
-- No Supabase schema, RPC, policy, or data change is required for this UI package.

do $$
begin
  raise notice 'DKD 2026-04-11 courier tracking patch: no database change required.';
end $$;
