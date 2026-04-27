-- 010_admin_loot_system.sql
create or replace function public.dkd_admin_loot_add(
  dkd_param_drop_type text,
  dkd_param_rarity text,
  dkd_param_weight integer,
  dkd_param_card_def_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id bigint;
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  insert into public.dkd_loot_entries(drop_type, rarity, weight, card_def_id)
  values (lower(coalesce(dkd_param_drop_type, 'map')), lower(coalesce(dkd_param_rarity, 'common')), greatest(coalesce(dkd_param_weight, 1), 1), dkd_param_card_def_id)
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

create or replace function public.dkd_admin_loot_delete(dkd_param_entry_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  delete from public.dkd_loot_entries where id = dkd_param_entry_id;
  if not found then
    raise exception 'loot_entry_not_found';
  end if;

  return dkd_param_entry_id;
end;
$$;
