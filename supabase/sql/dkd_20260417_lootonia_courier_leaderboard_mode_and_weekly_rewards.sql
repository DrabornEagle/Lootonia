-- Lootonia courier leaderboard weekly reward + popup + UI backend support
-- Standard: dkd_

begin;

create table if not exists public.dkd_courier_weekly_reward_claims (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  rank integer not null,
  reward_token integer not null default 0,
  reward_shards integer not null default 0,
  reward_boss_tickets integer not null default 0,
  reward_card_def_id_text text,
  reward_card_name text,
  reward_card_series text,
  popup_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dkd_courier_weekly_reward_claims_unique unique (user_id, week_start)
);

create index if not exists idx_dkd_courier_weekly_reward_claims_user_week
  on public.dkd_courier_weekly_reward_claims(user_id, week_start desc);

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
  dkd_var_rows jsonb := '[]'::jsonb;
begin
  if dkd_var_metric = 'courier' then
    with dkd_courier_completed_rows as (
      select
        public.dkd_cargo_shipments.assigned_courier_user_id as user_id,
        count(*)::integer as completed_count
      from public.dkd_cargo_shipments
      where public.dkd_cargo_shipments.assigned_courier_user_id is not null
        and lower(coalesce(public.dkd_cargo_shipments.status, '')) = 'completed'
        and public.dkd_cargo_shipments.completed_at >= dkd_param_week_start::timestamp
        and public.dkd_cargo_shipments.completed_at < (dkd_param_week_start::timestamp + interval '7 day')
      group by public.dkd_cargo_shipments.assigned_courier_user_id

      union all

      select
        public.dkd_courier_jobs.assigned_user_id as user_id,
        count(*)::integer as completed_count
      from public.dkd_courier_jobs
      where public.dkd_courier_jobs.assigned_user_id is not null
        and lower(coalesce(public.dkd_courier_jobs.status, '')) = 'completed'
        and public.dkd_courier_jobs.completed_at >= dkd_param_week_start::timestamp
        and public.dkd_courier_jobs.completed_at < (dkd_param_week_start::timestamp + interval '7 day')
        and coalesce(public.dkd_courier_jobs.cargo_shipment_id, 0) = 0
      group by public.dkd_courier_jobs.assigned_user_id
    ),
    dkd_courier_scored_rows as (
      select
        dkd_alias_courier_completed.user_id,
        coalesce(
          nullif(max(public.dkd_profiles.nickname), ''),
          'Kurye-' || left(dkd_alias_courier_completed.user_id::text, 8)
        ) as label,
        coalesce(sum(dkd_alias_courier_completed.completed_count), 0)::integer as value
      from dkd_courier_completed_rows as dkd_alias_courier_completed
      left join public.dkd_profiles
        on public.dkd_profiles.user_id = dkd_alias_courier_completed.user_id
      group by dkd_alias_courier_completed.user_id
    ),
    dkd_courier_ranked_rows as (
      select
        dkd_alias_courier_scored.user_id,
        dkd_alias_courier_scored.label,
        dkd_alias_courier_scored.value,
        row_number() over (
          order by dkd_alias_courier_scored.value desc, dkd_alias_courier_scored.label asc, dkd_alias_courier_scored.user_id asc
        ) as rank
      from dkd_courier_scored_rows as dkd_alias_courier_scored
      where coalesce(dkd_alias_courier_scored.value, 0) > 0
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', dkd_alias_courier_final.user_id,
          'label', dkd_alias_courier_final.label,
          'nickname', dkd_alias_courier_final.label,
          'value', dkd_alias_courier_final.value,
          'rank', dkd_alias_courier_final.rank,
          'delivery_count', dkd_alias_courier_final.value
        )
        order by dkd_alias_courier_final.rank
      ),
      '[]'::jsonb
    )
    into dkd_var_rows
    from (
      select *
      from dkd_courier_ranked_rows
      order by rank
      limit greatest(coalesce(dkd_param_limit, 25), 1)
    ) as dkd_alias_courier_final;

    return coalesce(dkd_var_rows, '[]'::jsonb);
  end if;

  with dkd_ranked_rows as (
    select
      public.dkd_chest_logs.user_id,
      coalesce(nullif(public.dkd_profiles.nickname, ''), 'Player-' || left(public.dkd_chest_logs.user_id::text, 8)) as label,
      case
        when dkd_var_metric = 'boss' then count(*) filter (where lower(coalesce(public.dkd_chest_logs.drop_type, '')) = 'boss')::integer
        else coalesce(sum(coalesce(public.dkd_chest_logs.gained_token, 0)), 0)::integer
      end as value
    from public.dkd_chest_logs
    left join public.dkd_profiles
      on public.dkd_profiles.user_id = public.dkd_chest_logs.user_id
    where public.dkd_chest_logs.created_at >= dkd_param_week_start::timestamp
      and public.dkd_chest_logs.created_at < (dkd_param_week_start::timestamp + interval '7 day')
    group by public.dkd_chest_logs.user_id, public.dkd_profiles.nickname
  ),
  dkd_filtered_rows as (
    select
      dkd_alias_ranked.user_id,
      dkd_alias_ranked.label,
      dkd_alias_ranked.value,
      row_number() over (order by dkd_alias_ranked.value desc, dkd_alias_ranked.label asc, dkd_alias_ranked.user_id asc) as rank
    from dkd_ranked_rows as dkd_alias_ranked
    where coalesce(dkd_alias_ranked.value, 0) > 0
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', dkd_alias_filtered.user_id,
        'label', dkd_alias_filtered.label,
        'nickname', dkd_alias_filtered.label,
        'value', dkd_alias_filtered.value,
        'rank', dkd_alias_filtered.rank
      )
      order by dkd_alias_filtered.rank
    ),
    '[]'::jsonb
  )
  into dkd_var_rows
  from (
    select *
    from dkd_filtered_rows
    order by rank
    limit greatest(coalesce(dkd_param_limit, 25), 1)
  ) as dkd_alias_filtered;

  return coalesce(dkd_var_rows, '[]'::jsonb);
end;
$$;

create or replace function public.dkd_compute_weekly_rows(
  dkd_param_metric text default 'token',
  dkd_param_week_start date default public.dkd_calc_week_start(0),
  dkd_param_limit integer default 25
)
returns jsonb
language sql
stable
as $$
  select public.dkd_build_weekly_rows(
    coalesce(dkd_param_metric, 'token'),
    coalesce(dkd_param_week_start, public.dkd_calc_week_start(0)),
    greatest(coalesce(dkd_param_limit, 25), 1)
  );
$$;

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
  if dkd_var_metric not in ('token', 'boss', 'courier') then
    dkd_var_metric := 'token';
  end if;

  select public.dkd_weekly_leaderboard_cache.closed, public.dkd_weekly_leaderboard_cache.rows
  into dkd_var_closed, dkd_var_rows
  from public.dkd_weekly_leaderboard_cache
  where public.dkd_weekly_leaderboard_cache.metric = dkd_var_metric
    and public.dkd_weekly_leaderboard_cache.week_start = dkd_var_week_start
  limit 1;

  if dkd_var_rows is null or coalesce(dkd_var_closed, false) = false then
    dkd_var_rows := public.dkd_build_weekly_rows(
      dkd_var_metric,
      dkd_var_week_start,
      greatest(coalesce(dkd_param_limit, 25), 1)
    );
  else
    dkd_var_rows := coalesce(
      (
        select jsonb_agg(dkd_alias_cached.obj order by (dkd_alias_cached.obj->>'rank')::integer)
        from (
          select dkd_alias_cached_inner.obj
          from jsonb_array_elements(dkd_var_rows) as dkd_alias_cached_inner(obj)
          order by (dkd_alias_cached_inner.obj->>'rank')::integer
          limit greatest(coalesce(dkd_param_limit, 25), 1)
        ) as dkd_alias_cached
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
  dkd_var_courier_rows jsonb;
  dkd_var_already_closed boolean := false;
begin
  if not public.dkd_is_admin() then
    raise exception 'not_admin';
  end if;

  select coalesce(bool_and(public.dkd_weekly_leaderboard_cache.closed), false)
  into dkd_var_already_closed
  from public.dkd_weekly_leaderboard_cache
  where public.dkd_weekly_leaderboard_cache.week_start = dkd_var_week_start
    and public.dkd_weekly_leaderboard_cache.metric in ('token', 'boss', 'courier');

  dkd_var_token_rows := public.dkd_build_weekly_rows('token', dkd_var_week_start, greatest(coalesce(dkd_param_limit, 50), 1));
  dkd_var_boss_rows := public.dkd_build_weekly_rows('boss', dkd_var_week_start, greatest(coalesce(dkd_param_limit, 50), 1));
  dkd_var_courier_rows := public.dkd_build_weekly_rows('courier', dkd_var_week_start, greatest(coalesce(dkd_param_limit, 50), 1));

  insert into public.dkd_weekly_leaderboard_cache (metric, week_start, closed, rows, updated_at)
  values ('token', dkd_var_week_start, true, coalesce(dkd_var_token_rows, '[]'::jsonb), now())
  on conflict (metric, week_start) do update
  set closed = true, rows = excluded.rows, updated_at = now();

  insert into public.dkd_weekly_leaderboard_cache (metric, week_start, closed, rows, updated_at)
  values ('boss', dkd_var_week_start, true, coalesce(dkd_var_boss_rows, '[]'::jsonb), now())
  on conflict (metric, week_start) do update
  set closed = true, rows = excluded.rows, updated_at = now();

  insert into public.dkd_weekly_leaderboard_cache (metric, week_start, closed, rows, updated_at)
  values ('courier', dkd_var_week_start, true, coalesce(dkd_var_courier_rows, '[]'::jsonb), now())
  on conflict (metric, week_start) do update
  set closed = true, rows = excluded.rows, updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'already_closed', coalesce(dkd_var_already_closed, false),
    'week_start', dkd_var_week_start
  );
end;
$$;

revoke all on function public.dkd_admin_close_week(integer, integer) from public;
grant execute on function public.dkd_admin_close_week(integer, integer) to authenticated;

create or replace function public.dkd_check_courier_weekly_reward_popup()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid := auth.uid();
  dkd_var_week_start date := public.dkd_calc_week_start(-1);
  dkd_var_rows jsonb;
  dkd_var_row jsonb;
  dkd_var_rank integer;
  dkd_var_reward_token integer := 0;
  dkd_var_reward_shards integer := 0;
  dkd_var_reward_boss_tickets integer := 3;
  dkd_var_reward_card_def_id_text text;
  dkd_var_reward_card_name text;
  dkd_var_reward_card_series text;
  dkd_var_claim_row public.dkd_courier_weekly_reward_claims%rowtype;
  dkd_var_card_def_id_type text;
begin
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select public.dkd_weekly_leaderboard_cache.rows
  into dkd_var_rows
  from public.dkd_weekly_leaderboard_cache
  where public.dkd_weekly_leaderboard_cache.metric = 'courier'
    and public.dkd_weekly_leaderboard_cache.week_start = dkd_var_week_start
    and public.dkd_weekly_leaderboard_cache.closed = true
  limit 1;

  if dkd_var_rows is null then
    dkd_var_rows := public.dkd_build_weekly_rows('courier', dkd_var_week_start, 50);

    insert into public.dkd_weekly_leaderboard_cache(metric, week_start, closed, rows, updated_at)
    values ('courier', dkd_var_week_start, true, coalesce(dkd_var_rows, '[]'::jsonb), now())
    on conflict (metric, week_start) do update
    set closed = true, rows = excluded.rows, updated_at = now();
  end if;

  select dkd_alias_reward_row.obj
  into dkd_var_row
  from jsonb_array_elements(coalesce(dkd_var_rows, '[]'::jsonb)) as dkd_alias_reward_row(obj)
  where dkd_alias_reward_row.obj->>'user_id' = dkd_var_user_id::text
    and coalesce((dkd_alias_reward_row.obj->>'rank')::integer, 9999) between 1 and 3
  limit 1;

  if dkd_var_row is null then
    return jsonb_build_object('ok', true, 'has_popup', false, 'reason', 'not_in_top3');
  end if;

  dkd_var_rank := coalesce((dkd_var_row->>'rank')::integer, 9999);

  select *
  into dkd_var_claim_row
  from public.dkd_courier_weekly_reward_claims
  where public.dkd_courier_weekly_reward_claims.user_id = dkd_var_user_id
    and public.dkd_courier_weekly_reward_claims.week_start = dkd_var_week_start
  limit 1;

  if dkd_var_claim_row.id is null then
    dkd_var_reward_token := floor(random() * 91)::integer + 10;
    dkd_var_reward_shards := floor(random() * 36)::integer + 5;

    select public.dkd_card_defs.id::text, public.dkd_card_defs.name, public.dkd_card_defs.series
    into dkd_var_reward_card_def_id_text, dkd_var_reward_card_name, dkd_var_reward_card_series
    from public.dkd_card_defs
    where coalesce(public.dkd_card_defs.is_active, true) = true
    order by random()
    limit 1;

    update public.dkd_profiles
    set token = coalesce(public.dkd_profiles.token, 0) + dkd_var_reward_token,
        shards = coalesce(public.dkd_profiles.shards, 0) + dkd_var_reward_shards,
        boss_tickets = coalesce(public.dkd_profiles.boss_tickets, 0) + dkd_var_reward_boss_tickets,
        updated_at = now()
    where public.dkd_profiles.user_id = dkd_var_user_id;

    select format_type(pg_attribute.atttypid, pg_attribute.atttypmod)
    into dkd_var_card_def_id_type
    from pg_attribute
    join pg_class on pg_class.oid = pg_attribute.attrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'dkd_user_cards'
      and pg_attribute.attname = 'card_def_id'
      and pg_attribute.attnum > 0
      and not pg_attribute.attisdropped
    limit 1;

    if dkd_var_reward_card_def_id_text is not null and dkd_var_card_def_id_type is not null then
      execute format(
        'insert into public.dkd_user_cards (user_id, card_def_id, source) values ($1, $2::%s, $3)',
        dkd_var_card_def_id_type
      )
      using dkd_var_user_id, dkd_var_reward_card_def_id_text, 'courier_weekly_leader_reward';
    end if;

    insert into public.dkd_courier_weekly_reward_claims (
      user_id,
      week_start,
      rank,
      reward_token,
      reward_shards,
      reward_boss_tickets,
      reward_card_def_id_text,
      reward_card_name,
      reward_card_series,
      popup_seen_at
    )
    values (
      dkd_var_user_id,
      dkd_var_week_start,
      dkd_var_rank,
      dkd_var_reward_token,
      dkd_var_reward_shards,
      dkd_var_reward_boss_tickets,
      dkd_var_reward_card_def_id_text,
      dkd_var_reward_card_name,
      dkd_var_reward_card_series,
      null
    )
    returning * into dkd_var_claim_row;
  end if;

  if dkd_var_claim_row.popup_seen_at is not null then
    return jsonb_build_object('ok', true, 'has_popup', false, 'reason', 'popup_already_seen');
  end if;

  update public.dkd_courier_weekly_reward_claims
  set popup_seen_at = now(), updated_at = now()
  where public.dkd_courier_weekly_reward_claims.id = dkd_var_claim_row.id;

  return jsonb_build_object(
    'ok', true,
    'has_popup', true,
    'week_start', dkd_var_claim_row.week_start,
    'rank', dkd_var_claim_row.rank,
    'reward_token', dkd_var_claim_row.reward_token,
    'reward_shards', dkd_var_claim_row.reward_shards,
    'reward_boss_tickets', dkd_var_claim_row.reward_boss_tickets,
    'reward_card_name', dkd_var_claim_row.reward_card_name,
    'reward_card_series', dkd_var_claim_row.reward_card_series
  );
end;
$$;

revoke all on function public.dkd_check_courier_weekly_reward_popup() from public;
grant execute on function public.dkd_check_courier_weekly_reward_popup() to authenticated;

commit;
