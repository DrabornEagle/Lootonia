create or replace function public.dkd__effective_energy(
  dkd_param_energy integer,
  dkd_param_energy_max integer,
  dkd_param_energy_updated_at timestamptz
)
returns integer
language sql
stable
set search_path = public
as $$
  select least(
    greatest(coalesce(dkd_param_energy_max, 0), 0),
    greatest(coalesce(dkd_param_energy, 0), 0)
    + floor(greatest(extract(epoch from (now() - coalesce(dkd_param_energy_updated_at, now()))), 0) / 1800.0)::integer
  );
$$;

create or replace function public.dkd_market_token_shop_buy(dkd_param_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid;
  dkd_kind text;
  dkd_cost_token integer := 0;
  dkd_reward_shards integer := 0;
  dkd_reward_tickets integer := 0;
  dkd_reward_energy integer := 0;
  dkd_token integer := 0;
  dkd_shards integer := 0;
  dkd_tickets integer := 0;
  dkd_energy integer := 0;
  dkd_energy_max integer := 20;
  dkd_energy_updated_at timestamptz := now();
begin
  dkd_user_id := auth.uid();
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_kind := lower(coalesce(trim(dkd_param_kind), ''));
  if dkd_kind = 'shard_40' then
    dkd_cost_token := 160;
    dkd_reward_shards := 40;
  elsif dkd_kind = 'ticket_1' then
    dkd_cost_token := 360;
    dkd_reward_tickets := 1;
  elsif dkd_kind = 'energy_5' then
    dkd_cost_token := 120;
    dkd_reward_energy := 5;
  elsif dkd_kind = 'energy_10' then
    dkd_cost_token := 220;
    dkd_reward_energy := 10;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_kind');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  select
    coalesce(token, 0),
    coalesce(shards, 0),
    coalesce(boss_tickets, 0),
    coalesce(energy, 0),
    greatest(1, coalesce(energy_max, 20)),
    coalesce(energy_updated_at, now())
  into
    dkd_token,
    dkd_shards,
    dkd_tickets,
    dkd_energy,
    dkd_energy_max,
    dkd_energy_updated_at
  from public.dkd_profiles
  where user_id = dkd_user_id
  for update;

  if dkd_token < dkd_cost_token then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_token');
  end if;

  if dkd_reward_energy > 0 and dkd_energy >= dkd_energy_max then
    return jsonb_build_object('ok', false, 'reason', 'energy_full');
  end if;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) - dkd_cost_token,
    shards = coalesce(shards, 0) + dkd_reward_shards,
    boss_tickets = coalesce(boss_tickets, 0) + dkd_reward_tickets,
    energy = least(greatest(1, coalesce(energy_max, 20)), coalesce(energy, 0) + dkd_reward_energy),
    energy_updated_at = case
      when dkd_reward_energy > 0 then now()
      else coalesce(energy_updated_at, now())
    end,
    updated_at = now()
  where user_id = dkd_user_id
  returning
    coalesce(token, 0),
    coalesce(shards, 0),
    coalesce(boss_tickets, 0),
    coalesce(energy, 0),
    greatest(1, coalesce(energy_max, 20)),
    coalesce(energy_updated_at, now())
  into
    dkd_token,
    dkd_shards,
    dkd_tickets,
    dkd_energy,
    dkd_energy_max,
    dkd_energy_updated_at;

  return jsonb_build_object(
    'ok', true,
    'kind', dkd_kind,
    'spent_token', dkd_cost_token,
    'reward_shards', dkd_reward_shards,
    'reward_tickets', dkd_reward_tickets,
    'reward_energy', dkd_reward_energy,
    'token', dkd_token,
    'shards', dkd_shards,
    'boss_tickets', dkd_tickets,
    'energy', dkd_energy,
    'energy_max', dkd_energy_max,
    'energy_updated_at', dkd_energy_updated_at
  );
end;
$$;

revoke all on function public.dkd_market_token_shop_buy(text) from public;
grant execute on function public.dkd_market_token_shop_buy(text) to authenticated;
