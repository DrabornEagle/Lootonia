-- 012_shard_system.sql
-- TODO: rarity / shard economy kuralları finalize edilmeli.

create or replace function public.dkd_recycle_duplicates_all()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_recycle_duplicates_all');
end;
$$;

create or replace function public.dkd_shard_exchange(dkd_param_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_shard_exchange');
end;
$$;

create or replace function public.dkd_shard_craft(dkd_param_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_shard_craft');
end;
$$;

create or replace function public.dkd_shard_upgrade_random(dkd_param_from_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_shard_upgrade_random');
end;
$$;

create or replace function public.dkd_craft_boss_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_craft_boss_ticket');
end;
$$;
