-- dkd_boss_market_energy_patch.sql
-- Lootonia boss HP alanı + market token shop enerji paketleri
-- Bu patch yalnızca dkd_* adlandırması kullanır.

begin;

alter table if exists public.dkd_boss_defs
  add column if not exists boss_hp_display integer not null default 985000;

update public.dkd_boss_defs
set boss_hp_display = greatest(coalesce(boss_hp_display, 985000), 1)
where boss_hp_display is null
   or boss_hp_display < 1;

drop function if exists public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,text,jsonb,boolean);

create or replace function public.dkd_admin_boss_upsert(
  dkd_param_drop_id text,
  dkd_param_boss_key text,
  dkd_param_title text,
  dkd_param_subtitle text default null,
  dkd_param_description text default null,
  dkd_param_reward_summary text default null,
  dkd_param_ticket_cost integer default 1,
  dkd_param_boss_hp_display integer default 985000,
  dkd_param_art_image_url text default null,
  dkd_param_question_set jsonb default '[]'::jsonb,
  dkd_param_is_active boolean default true
) returns setof public.dkd_boss_defs
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_drop_id uuid;
  dkd_row public.dkd_boss_defs;
begin
  if dkd_param_drop_id is null or btrim(dkd_param_drop_id) = '' then
    raise exception 'drop_id_required';
  end if;

  dkd_drop_id := dkd_param_drop_id::uuid;

  insert into public.dkd_boss_defs(
    drop_id,
    boss_key,
    title,
    subtitle,
    description,
    reward_summary,
    ticket_cost,
    boss_hp_display,
    art_image_url,
    question_set,
    is_active
  ) values (
    dkd_drop_id,
    coalesce(nullif(trim(dkd_param_boss_key), ''), concat('boss-', left(replace(dkd_drop_id::text, '-', ''), 8))),
    coalesce(nullif(trim(dkd_param_title), ''), 'Boss'),
    nullif(trim(dkd_param_subtitle), ''),
    nullif(trim(dkd_param_description), ''),
    nullif(trim(dkd_param_reward_summary), ''),
    greatest(1, coalesce(dkd_param_ticket_cost, 1)),
    greatest(1, coalesce(dkd_param_boss_hp_display, 985000)),
    nullif(trim(dkd_param_art_image_url), ''),
    coalesce(dkd_param_question_set, '[]'::jsonb),
    coalesce(dkd_param_is_active, true)
  )
  on conflict (drop_id) do update set
    boss_key = excluded.boss_key,
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    reward_summary = excluded.reward_summary,
    ticket_cost = excluded.ticket_cost,
    boss_hp_display = excluded.boss_hp_display,
    art_image_url = excluded.art_image_url,
    question_set = excluded.question_set,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into dkd_row;

  return next dkd_row;
end;
$$;

grant execute on function public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,integer,text,jsonb,boolean) to authenticated;

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
  dkd_energy_max integer := 0;
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
    greatest(coalesce(energy, 0), 0),
    greatest(coalesce(energy_max, 0), 0)
  into
    dkd_token,
    dkd_shards,
    dkd_tickets,
    dkd_energy,
    dkd_energy_max
  from public.dkd_profiles
  where user_id = dkd_user_id
  for update;

  if dkd_token < dkd_cost_token then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_token');
  end if;

  if dkd_reward_energy > 0 and dkd_energy >= dkd_energy_max then
    return jsonb_build_object(
      'ok', false,
      'reason', 'energy_full',
      'energy', dkd_energy,
      'energy_max', dkd_energy_max
    );
  end if;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) - dkd_cost_token,
    shards = coalesce(shards, 0) + dkd_reward_shards,
    boss_tickets = coalesce(boss_tickets, 0) + dkd_reward_tickets,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_reward_energy),
    updated_at = now()
  where user_id = dkd_user_id
  returning
    coalesce(token, 0),
    coalesce(shards, 0),
    coalesce(boss_tickets, 0),
    greatest(coalesce(energy, 0), 0),
    greatest(coalesce(energy_max, 0), 0)
  into
    dkd_token,
    dkd_shards,
    dkd_tickets,
    dkd_energy,
    dkd_energy_max;

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
    'energy_max', dkd_energy_max
  );
end;
$$;

revoke all on function public.dkd_market_token_shop_buy(text) from public;
grant execute on function public.dkd_market_token_shop_buy(text) to authenticated;

commit;
