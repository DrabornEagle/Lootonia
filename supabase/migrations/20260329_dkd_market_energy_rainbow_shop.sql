create or replace function public.dkd_market_token_shop_buy(dkd_param_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_kind text;
  dkd_var_cost_token integer := 0;
  dkd_var_reward_shards integer := 0;
  dkd_var_reward_tickets integer := 0;
  dkd_var_reward_energy integer := 0;
  dkd_var_token integer := 0;
  dkd_var_shards integer := 0;
  dkd_var_tickets integer := 0;
  dkd_var_energy integer := 0;
  dkd_var_energy_max integer := 20;
  dkd_var_energy_updated_at timestamptz := now();
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_kind := lower(coalesce(trim(dkd_param_kind), ''));
  if dkd_var_kind = 'shard_40' then
    dkd_var_cost_token := 160;
    dkd_var_reward_shards := 40;
  elsif dkd_var_kind = 'ticket_1' then
    dkd_var_cost_token := 360;
    dkd_var_reward_tickets := 1;
  elsif dkd_var_kind = 'energy_5' then
    dkd_var_cost_token := 120;
    dkd_var_reward_energy := 5;
  elsif dkd_var_kind = 'energy_10' then
    dkd_var_cost_token := 220;
    dkd_var_reward_energy := 10;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_kind');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select
    coalesce(token, 0),
    coalesce(shards, 0),
    coalesce(boss_tickets, 0),
    coalesce(energy, 0),
    greatest(1, coalesce(energy_max, 20)),
    coalesce(energy_updated_at, now())
  into
    dkd_var_token,
    dkd_var_shards,
    dkd_var_tickets,
    dkd_var_energy,
    dkd_var_energy_max,
    dkd_var_energy_updated_at
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_token < dkd_var_cost_token then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_token');
  end if;

  if dkd_var_reward_energy > 0 and dkd_var_energy >= dkd_var_energy_max then
    return jsonb_build_object('ok', false, 'reason', 'energy_full');
  end if;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) - dkd_var_cost_token,
    shards = coalesce(shards, 0) + dkd_var_reward_shards,
    boss_tickets = coalesce(boss_tickets, 0) + dkd_var_reward_tickets,
    energy = least(greatest(1, coalesce(energy_max, 20)), coalesce(energy, 0) + dkd_var_reward_energy),
    energy_updated_at = case
      when dkd_var_reward_energy > 0 then now()
      else coalesce(energy_updated_at, now())
    end,
    updated_at = now()
  where user_id = dkd_var_user_id
  returning
    coalesce(token, 0),
    coalesce(shards, 0),
    coalesce(boss_tickets, 0),
    coalesce(energy, 0),
    greatest(1, coalesce(energy_max, 20)),
    coalesce(energy_updated_at, now())
  into
    dkd_var_token,
    dkd_var_shards,
    dkd_var_tickets,
    dkd_var_energy,
    dkd_var_energy_max,
    dkd_var_energy_updated_at;

  return jsonb_build_object(
    'ok', true,
    'kind', dkd_var_kind,
    'spent_token', dkd_var_cost_token,
    'reward_shards', dkd_var_reward_shards,
    'reward_tickets', dkd_var_reward_tickets,
    'reward_energy', dkd_var_reward_energy,
    'token', dkd_var_token,
    'shards', dkd_var_shards,
    'boss_tickets', dkd_var_tickets,
    'energy', dkd_var_energy,
    'energy_max', dkd_var_energy_max,
    'energy_updated_at', dkd_var_energy_updated_at
  );
end;
$$;

revoke all on function public.dkd_market_token_shop_buy(text) from public;
grant execute on function public.dkd_market_token_shop_buy(text) to authenticated;
