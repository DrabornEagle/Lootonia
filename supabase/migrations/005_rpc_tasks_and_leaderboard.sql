-- 005_rpc_tasks_and_leaderboard.sql
-- Lootonia gorev, haftalik gorev ve leaderboard RPC'leri

create or replace function public.dkd_calc_week_start(dkd_param_week_offset integer default 0)
returns date
language sql
stable
as $$
  select (
    ((now() at time zone 'Europe/Istanbul')::date)
    - ((extract(isodow from (now() at time zone 'Europe/Istanbul'))::int) - 1)
    + (coalesce(dkd_param_week_offset, 0) * 7)
  )::date
$$;

create table if not exists public.dkd_weekly_leaderboard_cache (
  metric text not null,
  week_start date not null,
  closed boolean not null default false,
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (metric, week_start)
);

alter table public.dkd_weekly_leaderboard_cache add column if not exists metric text;
alter table public.dkd_weekly_leaderboard_cache add column if not exists week_start date;
alter table public.dkd_weekly_leaderboard_cache add column if not exists closed boolean not null default false;
alter table public.dkd_weekly_leaderboard_cache add column if not exists rows jsonb not null default '[]'::jsonb;
alter table public.dkd_weekly_leaderboard_cache add column if not exists created_at timestamptz not null default now();
alter table public.dkd_weekly_leaderboard_cache add column if not exists updated_at timestamptz not null default now();

create table if not exists public.dkd_weekly_top_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  week_start date not null,
  rank integer not null,
  reward_token integer not null default 0,
  reward_energy integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, metric, week_start)
);

create or replace function public.dkd_build_weekly_rows(
  dkd_param_metric text,
  dkd_param_week_start date,
  dkd_param_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_metric text := lower(coalesce(trim(dkd_param_metric), 'token'));
  dkd_var_rows jsonb;
begin
  with ranked as (
    select
      dkd_alias_l.user_id,
      coalesce(nullif(dkd_alias_p.nickname, ''), 'Player-' || left(dkd_alias_l.user_id::text, 8)) as label,
      case
        when dkd_var_metric = 'boss' then count(*) filter (where lower(coalesce(dkd_alias_l.drop_type, '')) = 'boss')::integer
        else coalesce(sum(coalesce(dkd_alias_l.gained_token, 0)), 0)::integer
      end as value
    from public.dkd_chest_logs dkd_alias_l
    left join public.dkd_profiles dkd_alias_p
      on dkd_alias_p.user_id = dkd_alias_l.user_id
    where dkd_alias_l.created_at >= dkd_param_week_start::timestamp
      and dkd_alias_l.created_at < (dkd_param_week_start::timestamp + interval '7 day')
    group by dkd_alias_l.user_id, dkd_alias_p.nickname
  ),
  filtered as (
    select
      dkd_alias_r.user_id,
      dkd_alias_r.label,
      dkd_alias_r.value,
      row_number() over (order by dkd_alias_r.value desc, dkd_alias_r.label asc, dkd_alias_r.user_id asc) as rank
    from ranked dkd_alias_r
    where coalesce(dkd_alias_r.value, 0) > 0
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', dkd_alias_f.user_id,
        'label', dkd_alias_f.label,
        'value', dkd_alias_f.value,
        'rank', dkd_alias_f.rank
      )
      order by dkd_alias_f.rank
    ),
    '[]'::jsonb
  )
  into dkd_var_rows
  from (
    select *
    from filtered
    order by rank
    limit greatest(coalesce(dkd_param_limit, 25), 1)
  ) dkd_alias_f;

  return coalesce(dkd_var_rows, '[]'::jsonb);
end;
$$;

create or replace function public.dkd_task_claim(
  dkd_param_task_key text,
  dkd_param_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_profile public.dkd_profiles%rowtype;
  dkd_var_today text := ((now() at time zone 'Europe/Istanbul')::date)::text;
  dkd_var_task_key text := lower(coalesce(trim(dkd_param_task_key), ''));
  dkd_var_state jsonb;
  dkd_var_claims jsonb;
  dkd_var_token_reward integer := 0;
  dkd_var_energy_reward integer := 0;
  dkd_var_mult numeric := greatest(coalesce(dkd_param_mult, 1), 0.1);
  dkd_var_complete boolean := false;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select *
  into dkd_var_profile
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  dkd_var_state := coalesce(dkd_var_profile.task_state, '{}'::jsonb);

  if coalesce(dkd_var_state->>'day', '') <> dkd_var_today then
    dkd_var_state := jsonb_build_object(
      'day', dkd_var_today,
      'chests_opened', 0,
      'boss_solved', false,
      'claims', jsonb_build_object(
        'chest_1', false,
        'chest_3', false,
        'boss_1', false,
        'bonus', false
      )
    );
  end if;

  dkd_var_claims := coalesce(dkd_var_state->'claims', '{}'::jsonb);

  if coalesce((dkd_var_claims->>dkd_var_task_key)::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed', 'task_state', dkd_var_state);
  end if;

  if dkd_var_task_key = 'chest_1' then
    dkd_var_complete := coalesce((dkd_var_state->>'chests_opened')::integer, 0) >= 1;
    dkd_var_token_reward := 15;
    dkd_var_energy_reward := 0;
  elsif dkd_var_task_key = 'chest_3' then
    dkd_var_complete := coalesce((dkd_var_state->>'chests_opened')::integer, 0) >= 3;
    dkd_var_token_reward := 35;
    dkd_var_energy_reward := 0;
  elsif dkd_var_task_key = 'boss_1' then
    dkd_var_complete := coalesce((dkd_var_state->>'boss_solved')::boolean, false);
    dkd_var_token_reward := greatest(round(40 * dkd_var_mult)::integer, 40);
    dkd_var_energy_reward := 10;
  elsif dkd_var_task_key = 'bonus' then
    dkd_var_complete :=
      coalesce((dkd_var_claims->>'chest_1')::boolean, false)
      and coalesce((dkd_var_claims->>'chest_3')::boolean, false)
      and coalesce((dkd_var_claims->>'boss_1')::boolean, false);
    dkd_var_token_reward := 25;
    dkd_var_energy_reward := 0;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_task_key');
  end if;

  if not dkd_var_complete then
    return jsonb_build_object('ok', false, 'reason', 'task_not_complete', 'task_state', dkd_var_state);
  end if;

  dkd_var_state := jsonb_set(dkd_var_state, array['claims', dkd_var_task_key], 'true'::jsonb, true);

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_reward,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_energy_reward),
    task_state = dkd_var_state,
    updated_at = now()
  where user_id = dkd_var_user_id
  returning *
  into dkd_var_profile;

  return jsonb_build_object(
    'ok', true,
    'token', dkd_var_profile.token,
    'energy', dkd_var_profile.energy,
    'energy_max', dkd_var_profile.energy_max,
    'task_state', dkd_var_state,
    'reward_token', dkd_var_token_reward,
    'reward_energy', dkd_var_energy_reward
  );
end;
$$;

revoke all on function public.dkd_task_claim(text, numeric) from public;
grant execute on function public.dkd_task_claim(text, numeric) to authenticated;

create or replace function public.dkd_weekly_task_claim(
  dkd_param_task_key text,
  dkd_param_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_profile public.dkd_profiles%rowtype;
  dkd_var_week text := public.dkd_calc_week_start(0)::text;
  dkd_var_task_key text := lower(coalesce(trim(dkd_param_task_key), ''));
  dkd_var_state jsonb;
  dkd_var_claims jsonb;
  dkd_var_token_reward integer := 0;
  dkd_var_energy_reward integer := 0;
  dkd_var_mult numeric := greatest(coalesce(dkd_param_mult, 1), 0.1);
  dkd_var_complete boolean := false;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select *
  into dkd_var_profile
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  dkd_var_state := coalesce(dkd_var_profile.weekly_task_state, '{}'::jsonb);

  if coalesce(dkd_var_state->>'week', '') <> dkd_var_week then
    dkd_var_state := jsonb_build_object(
      'week', dkd_var_week,
      'chests_opened', 0,
      'boss_opened', 0,
      'unique_drops', 0,
      'claims', jsonb_build_object(
        'w_chest_10', false,
        'w_boss_3', false,
        'w_unique_5', false,
        'w_bonus', false
      )
    );
  end if;

  dkd_var_claims := coalesce(dkd_var_state->'claims', '{}'::jsonb);

  if coalesce((dkd_var_claims->>dkd_var_task_key)::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed', 'weekly_task_state', dkd_var_state);
  end if;

  if dkd_var_task_key = 'w_chest_10' then
    dkd_var_complete := coalesce((dkd_var_state->>'chests_opened')::integer, 0) >= 10;
    dkd_var_token_reward := 120;
    dkd_var_energy_reward := 10;
  elsif dkd_var_task_key = 'w_boss_3' then
    dkd_var_complete := coalesce((dkd_var_state->>'boss_opened')::integer, 0) >= 3;
    dkd_var_token_reward := greatest(round(200 * dkd_var_mult)::integer, 200);
    dkd_var_energy_reward := 20;
  elsif dkd_var_task_key = 'w_unique_5' then
    dkd_var_complete := coalesce((dkd_var_state->>'unique_drops')::integer, 0) >= 5;
    dkd_var_token_reward := 150;
    dkd_var_energy_reward := 0;
  elsif dkd_var_task_key = 'w_bonus' then
    dkd_var_complete :=
      coalesce((dkd_var_claims->>'w_chest_10')::boolean, false)
      and coalesce((dkd_var_claims->>'w_boss_3')::boolean, false)
      and coalesce((dkd_var_claims->>'w_unique_5')::boolean, false);
    dkd_var_token_reward := 250;
    dkd_var_energy_reward := 30;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_task_key');
  end if;

  if not dkd_var_complete then
    return jsonb_build_object('ok', false, 'reason', 'task_not_complete', 'weekly_task_state', dkd_var_state);
  end if;

  dkd_var_state := jsonb_set(dkd_var_state, array['claims', dkd_var_task_key], 'true'::jsonb, true);

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_reward,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_energy_reward),
    weekly_task_state = dkd_var_state,
    updated_at = now()
  where user_id = dkd_var_user_id
  returning *
  into dkd_var_profile;

  return jsonb_build_object(
    'ok', true,
    'token', dkd_var_profile.token,
    'energy', dkd_var_profile.energy,
    'energy_max', dkd_var_profile.energy_max,
    'weekly_task_state', dkd_var_state,
    'reward_token', dkd_var_token_reward,
    'reward_energy', dkd_var_energy_reward
  );
end;
$$;

revoke all on function public.dkd_weekly_task_claim(text, numeric) from public;
grant execute on function public.dkd_weekly_task_claim(text, numeric) to authenticated;

create or replace function public.dkd_get_weekly_leaderboard2(
  dkd_param_metric text default 'token',
  dkd_param_limit integer default 25,
  dkd_param_week_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_metric text := lower(coalesce(trim(dkd_param_metric), 'token'));
  dkd_var_week_start date := public.dkd_calc_week_start(coalesce(dkd_param_week_offset, 0));
  dkd_var_rows jsonb;
  dkd_var_closed boolean := false;
begin
  if dkd_var_metric not in ('token', 'boss') then
    dkd_var_metric := 'token';
  end if;

  select closed, rows
  into dkd_var_closed, dkd_var_rows
  from public.dkd_weekly_leaderboard_cache
  where metric = dkd_var_metric
    and week_start = dkd_var_week_start
  limit 1;

  if dkd_var_rows is null or coalesce(dkd_var_closed, false) = false then
    dkd_var_rows := public.dkd_build_weekly_rows(dkd_var_metric, dkd_var_week_start, greatest(coalesce(dkd_param_limit, 25), 1));
  else
    dkd_var_rows := coalesce(
      (
        select jsonb_agg(dkd_alias_x.obj order by (dkd_alias_x.obj->>'rank')::integer)
        from (
          select obj
          from jsonb_array_elements(dkd_var_rows) obj
          order by (obj->>'rank')::integer
          limit greatest(coalesce(dkd_param_limit, 25), 1)
        ) x
      ),
      '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'week_start', dkd_var_week_start,
    'closed', coalesce(dkd_var_closed, false),
    'rows', coalesce(dkd_var_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.dkd_get_weekly_leaderboard2(text, integer, integer) from public;
grant execute on function public.dkd_get_weekly_leaderboard2(text, integer, integer) to authenticated;

create or replace function public.dkd_admin_close_week(
  dkd_param_week_offset integer default -1,
  dkd_param_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_week_start date := public.dkd_calc_week_start(coalesce(dkd_param_week_offset, -1));
  dkd_var_token_rows jsonb;
  dkd_var_boss_rows jsonb;
  dkd_var_already_closed boolean := false;
begin
  if not public.dkd_is_admin() then
    raise exception 'not_admin';
  end if;

  select coalesce(bool_and(closed), false)
  into dkd_var_already_closed
  from public.dkd_weekly_leaderboard_cache
  where week_start = dkd_var_week_start
    and metric in ('token', 'boss');

  dkd_var_token_rows := public.dkd_build_weekly_rows('token', dkd_var_week_start, greatest(coalesce(dkd_param_limit, 50), 1));
  dkd_var_boss_rows := public.dkd_build_weekly_rows('boss', dkd_var_week_start, greatest(coalesce(dkd_param_limit, 50), 1));

  insert into public.dkd_weekly_leaderboard_cache (metric, week_start, closed, rows, updated_at)
  values ('token', dkd_var_week_start, true, coalesce(dkd_var_token_rows, '[]'::jsonb), now())
  on conflict (metric, week_start) do update
  set
    closed = true,
    rows = excluded.rows,
    updated_at = now();

  insert into public.dkd_weekly_leaderboard_cache (metric, week_start, closed, rows, updated_at)
  values ('boss', dkd_var_week_start, true, coalesce(dkd_var_boss_rows, '[]'::jsonb), now())
  on conflict (metric, week_start) do update
  set
    closed = true,
    rows = excluded.rows,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'already_closed', coalesce(dkd_var_already_closed, false),
    'week_start', dkd_var_week_start
  );
end;
$$;

revoke all on function public.dkd_admin_close_week(integer, integer) from public;
grant execute on function public.dkd_admin_close_week(integer, integer) to authenticated;

create or replace function public.dkd_claim_weekly_top_reward(
  dkd_param_metric text default 'token'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_metric text := lower(coalesce(trim(dkd_param_metric), 'token'));
  dkd_var_week_start date := public.dkd_calc_week_start(-1);
  dkd_var_rows jsonb;
  dkd_var_rank integer;
  dkd_var_reward_token integer := 0;
  dkd_var_reward_energy integer := 0;
  dkd_var_had_activity boolean := false;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  if dkd_var_metric not in ('token', 'boss') then
    dkd_var_metric := 'token';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  if exists (
    select 1
    from public.dkd_weekly_top_reward_claims
    where user_id = dkd_var_user_id
      and metric = dkd_var_metric
      and week_start = dkd_var_week_start
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  select rows
  into dkd_var_rows
  from public.dkd_weekly_leaderboard_cache
  where metric = dkd_var_metric
    and week_start = dkd_var_week_start
    and closed = true
  limit 1;

  if dkd_var_rows is null then
    dkd_var_rows := public.dkd_build_weekly_rows(dkd_var_metric, dkd_var_week_start, 100);
  end if;

  select exists(
    select 1
    from public.dkd_chest_logs dkd_alias_l
    where dkd_alias_l.user_id = dkd_var_user_id
      and dkd_alias_l.created_at >= dkd_var_week_start::timestamp
      and dkd_alias_l.created_at < (dkd_var_week_start::timestamp + interval '7 day')
  )
  into dkd_var_had_activity;

  select (obj->>'rank')::integer
  into dkd_var_rank
  from jsonb_array_elements(coalesce(dkd_var_rows, '[]'::jsonb)) obj
  where obj->>'user_id' = dkd_var_user_id::text
  limit 1;

  if dkd_var_rank is null then
    return jsonb_build_object(
      'ok', false,
      'reason', case when dkd_var_had_activity then 'not_in_top10' else 'no_activity' end
    );
  end if;

  if dkd_var_rank > 10 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'not_in_top10',
      'rank', dkd_var_rank
    );
  end if;

  if dkd_var_rank = 1 then
    dkd_var_reward_token := 500;
    dkd_var_reward_energy := 20;
  elsif dkd_var_rank = 2 then
    dkd_var_reward_token := 350;
    dkd_var_reward_energy := 15;
  elsif dkd_var_rank = 3 then
    dkd_var_reward_token := 250;
    dkd_var_reward_energy := 10;
  else
    dkd_var_reward_token := 100;
    dkd_var_reward_energy := 5;
  end if;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_reward_token,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_reward_energy),
    updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_weekly_top_reward_claims (
    user_id,
    metric,
    week_start,
    rank,
    reward_token,
    reward_energy
  )
  values (
    dkd_var_user_id,
    dkd_var_metric,
    dkd_var_week_start,
    dkd_var_rank,
    dkd_var_reward_token,
    dkd_var_reward_energy
  );

  return jsonb_build_object(
    'ok', true,
    'metric', dkd_var_metric,
    'week_start', dkd_var_week_start,
    'rank', dkd_var_rank,
    'reward_token', dkd_var_reward_token,
    'reward_energy', dkd_var_reward_energy
  );
end;
$$;

revoke all on function public.dkd_claim_weekly_top_reward(text) from public;
grant execute on function public.dkd_claim_weekly_top_reward(text) to authenticated;
