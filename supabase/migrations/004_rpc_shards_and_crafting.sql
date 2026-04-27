-- 004_rpc_shards_and_crafting.sql
-- Lootonia shard, craft, upgrade ve boss ticket RPC'leri

create or replace function public.dkd_shard_value(dkd_param_rarity text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(dkd_param_rarity, 'common'))
    when 'common' then 5
    when 'uncommon' then 8
    when 'rare' then 12
    when 'epic' then 25
    when 'legendary' then 60
    when 'mythic' then 120
    else 5
  end
$$;

create or replace function public.dkd_recycle_duplicates_all()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_recycled_cards integer := 0;
  dkd_var_gained_shards integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  with ranked as (
    select
      uc.id,
      uc.card_def_id,
      row_number() over (
        partition by uc.card_def_id
        order by uc.created_at asc, uc.id asc
      ) as rn
    from public.dkd_user_cards uc
    where uc.user_id = dkd_var_user_id
  ),
  dupes as (
    select
      dkd_alias_r.id,
      public.dkd_shard_value(dkd_alias_c.rarity) as shard_gain
    from ranked dkd_alias_r
    left join public.dkd_card_defs dkd_alias_c
      on dkd_alias_c.id = dkd_alias_r.card_def_id
    where dkd_alias_r.rn > 1
  )
  select
    coalesce(count(*), 0)::int,
    coalesce(sum(shard_gain), 0)::int
  into
    dkd_var_recycled_cards,
    dkd_var_gained_shards
  from dupes;

  if coalesce(dkd_var_recycled_cards, 0) <= 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'duplicate_not_found'
    );
  end if;

  delete from public.dkd_user_cards
  where id in (
    with ranked as (
      select
        uc.id,
        row_number() over (
          partition by uc.card_def_id
          order by uc.created_at asc, uc.id asc
        ) as rn
      from public.dkd_user_cards uc
      where uc.user_id = dkd_var_user_id
    )
    select id
    from ranked
    where rn > 1
  );

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) + dkd_var_gained_shards,
    updated_at = now()
  where user_id = dkd_var_user_id;

  return jsonb_build_object(
    'ok', true,
    'recycled_cards', dkd_var_recycled_cards,
    'gained_shards', dkd_var_gained_shards
  );
end;
$$;

revoke all on function public.dkd_recycle_duplicates_all() from public;
grant execute on function public.dkd_recycle_duplicates_all() to authenticated;

create or replace function public.dkd_shard_exchange(dkd_param_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_kind text;
  dkd_var_cost integer := 0;
  dkd_var_reward_token integer := 0;
  dkd_var_reward_energy integer := 0;
  dkd_var_shards integer := 0;
  dkd_var_energy integer := 0;
  dkd_var_energy_max integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_kind := lower(coalesce(trim(dkd_param_kind), ''));

  if dkd_var_kind = 'token_100' then
    dkd_var_cost := 40;
    dkd_var_reward_token := 100;
  elsif dkd_var_kind = 'energy_1' then
    dkd_var_cost := 30;
    dkd_var_reward_energy := 1;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_kind');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select
    coalesce(shards, 0),
    coalesce(energy, 0),
    coalesce(energy_max, 100)
  into
    dkd_var_shards,
    dkd_var_energy,
    dkd_var_energy_max
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  if dkd_var_reward_energy > 0 and dkd_var_energy >= dkd_var_energy_max then
    return jsonb_build_object('ok', false, 'reason', 'energy_full');
  end if;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    token = coalesce(token, 0) + dkd_var_reward_token,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_reward_energy),
    updated_at = now()
  where user_id = dkd_var_user_id;

  return jsonb_build_object(
    'ok', true,
    'kind', dkd_var_kind,
    'spent_shards', dkd_var_cost,
    'reward_token', dkd_var_reward_token,
    'reward_energy', dkd_var_reward_energy
  );
end;
$$;

revoke all on function public.dkd_shard_exchange(text) from public;
grant execute on function public.dkd_shard_exchange(text) to authenticated;

create or replace function public.dkd_shard_craft(dkd_param_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_rarity text;
  dkd_var_cost integer := 0;
  dkd_var_card_id uuid;
  dkd_var_card_name text;
  dkd_var_shards integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_rarity := lower(coalesce(trim(dkd_param_rarity), ''));

  if dkd_var_rarity = 'common' then
    dkd_var_cost := 45;
  elsif dkd_var_rarity = 'rare' then
    dkd_var_cost := 110;
  elsif dkd_var_rarity = 'epic' then
    dkd_var_cost := 260;
  elsif dkd_var_rarity = 'legendary' then
    dkd_var_cost := 620;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_rarity');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select coalesce(shards, 0)
  into dkd_var_shards
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  select
    dkd_alias_c.id,
    dkd_alias_c.name
  into
    dkd_var_card_id,
    dkd_var_card_name
  from public.dkd_card_defs dkd_alias_c
  where coalesce(dkd_alias_c.is_active, true) = true
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_rarity
  order by random()
  limit 1;

  if dkd_var_card_id is null then
    return jsonb_build_object('ok', false, 'reason', 'card_pool_empty');
  end if;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  values (dkd_var_user_id, dkd_var_card_id, 'shard_craft');

  return jsonb_build_object(
    'ok', true,
    'spent_shards', dkd_var_cost,
    'card_def_id', dkd_var_card_id,
    'card_name', dkd_var_card_name,
    'rarity', dkd_var_rarity
  );
end;
$$;

revoke all on function public.dkd_shard_craft(text) from public;
grant execute on function public.dkd_shard_craft(text) to authenticated;

create or replace function public.dkd_shard_upgrade_random(dkd_param_from_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_from text;
  dkd_var_to text;
  dkd_var_cost integer := 0;
  dkd_var_shards integer := 0;
  dkd_var_source_card_row_id bigint;
  dkd_var_burned_card_name text;
  dkd_var_new_card_id uuid;
  dkd_var_new_card_name text;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_from := lower(coalesce(trim(dkd_param_from_rarity), ''));

  if dkd_var_from = 'common' then
    dkd_var_to := 'rare';
    dkd_var_cost := 50;
  elsif dkd_var_from = 'rare' then
    dkd_var_to := 'epic';
    dkd_var_cost := 140;
  elsif dkd_var_from = 'epic' then
    dkd_var_to := 'legendary';
    dkd_var_cost := 320;
  elsif dkd_var_from = 'legendary' then
    dkd_var_to := 'mythic';
    dkd_var_cost := 800;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_from_rarity');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select coalesce(shards, 0)
  into dkd_var_shards
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  select
    uc.id,
    dkd_alias_c.name
  into
    dkd_var_source_card_row_id,
    dkd_var_burned_card_name
  from public.dkd_user_cards uc
  join public.dkd_card_defs dkd_alias_c
    on dkd_alias_c.id = uc.card_def_id
  where uc.user_id = dkd_var_user_id
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_from
  order by uc.created_at asc, uc.id asc
  limit 1;

  if dkd_var_source_card_row_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_source_card');
  end if;

  select
    dkd_alias_c.id,
    dkd_alias_c.name
  into
    dkd_var_new_card_id,
    dkd_var_new_card_name
  from public.dkd_card_defs dkd_alias_c
  where coalesce(dkd_alias_c.is_active, true) = true
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_to
  order by random()
  limit 1;

  if dkd_var_new_card_id is null then
    return jsonb_build_object('ok', false, 'reason', 'target_pool_empty');
  end if;

  delete from public.dkd_user_cards
  where id = dkd_var_source_card_row_id;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  values (dkd_var_user_id, dkd_var_new_card_id, 'shard_upgrade');

  return jsonb_build_object(
    'ok', true,
    'spent_shards', dkd_var_cost,
    'burned_card_name', dkd_var_burned_card_name,
    'card_def_id', dkd_var_new_card_id,
    'card_name', dkd_var_new_card_name,
    'to_rarity', dkd_var_to
  );
end;
$$;

revoke all on function public.dkd_shard_upgrade_random(text) from public;
grant execute on function public.dkd_shard_upgrade_random(text) to authenticated;

create or replace function public.dkd_craft_boss_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_cost integer := 90;
  dkd_var_shards integer := 0;
  dkd_var_boss_tickets integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select
    coalesce(shards, 0),
    coalesce(boss_tickets, 0)
  into
    dkd_var_shards,
    dkd_var_boss_tickets
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    boss_tickets = coalesce(boss_tickets, 0) + 1,
    updated_at = now()
  where user_id = dkd_var_user_id
  returning coalesce(boss_tickets, 0)
  into dkd_var_boss_tickets;

  return jsonb_build_object(
    'ok', true,
    'spent_shards', dkd_var_cost,
    'gained_tickets', 1,
    'boss_tickets', dkd_var_boss_tickets
  );
end;
$$;

revoke all on function public.dkd_craft_boss_ticket() from public;
grant execute on function public.dkd_craft_boss_ticket() to authenticated;
