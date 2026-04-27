-- DKD courier UI/XP wallet sync patch
begin;

alter table if exists public.dkd_profiles
  add column if not exists courier_xp integer not null default 0,
  add column if not exists courier_level integer not null default 1;

create or replace function public.dkd_courier_xp_total_for_level(dkd_param_level integer)
returns integer
language plpgsql
immutable
as $$
declare
  dkd_level integer := greatest(coalesce(dkd_param_level, 1), 1);
  dkd_step integer;
  dkd_total integer := 0;
begin
  if dkd_level <= 1 then
    return 0;
  end if;

  for dkd_step in 1..(dkd_level - 1) loop
    dkd_total := dkd_total + (90 + ((dkd_step - 1) * 55));
  end loop;

  return dkd_total;
end;
$$;

create or replace function public.dkd_courier_level_from_xp(dkd_param_xp integer)
returns integer
language plpgsql
immutable
as $$
declare
  dkd_xp integer := greatest(coalesce(dkd_param_xp, 0), 0);
  dkd_level integer := 1;
begin
  while dkd_xp >= public.dkd_courier_xp_total_for_level(dkd_level + 1) loop
    dkd_level := dkd_level + 1;
  end loop;

  return greatest(dkd_level, 1);
end;
$$;

update public.dkd_profiles
set courier_xp = greatest(coalesce(courier_xp, 0), coalesce(courier_score, 0)),
    courier_level = greatest(coalesce(courier_level, 1), public.dkd_courier_level_from_xp(greatest(coalesce(courier_xp, 0), coalesce(courier_score, 0))))
where true;

create or replace function public.dkd_apply_courier_license(dkd_param_zone text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_level integer := 1;
  dkd_status text := 'none';
  dkd_zone text := left(coalesce(nullif(trim(dkd_param_zone), ''), 'Eryaman'), 60);
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  select
    coalesce(level, 1),
    coalesce(courier_status, 'none')
  into dkd_level, dkd_status
  from public.dkd_profiles
  where user_id = dkd_user_id;

  if dkd_level < 10 then
    raise exception 'courier_level_required';
  end if;

  if dkd_status = 'approved' then
    update public.dkd_profiles
    set courier_city = 'Ankara',
        courier_zone = dkd_zone,
        updated_at = now()
    where user_id = dkd_user_id;
    return 'already_approved';
  end if;

  if dkd_status = 'pending' then
    update public.dkd_profiles
    set courier_city = 'Ankara',
        courier_zone = dkd_zone,
        updated_at = now()
    where user_id = dkd_user_id;
    return 'already_pending';
  end if;

  update public.dkd_profiles
  set courier_status = 'pending',
      courier_city = 'Ankara',
      courier_zone = dkd_zone,
      courier_profile_meta = coalesce(courier_profile_meta, '{}'::jsonb) || jsonb_build_object(
        'selected_zone', dkd_zone,
        'application_source', 'dkd_apply_courier_license',
        'updated_at', now()
      ),
      updated_at = now()
  where user_id = dkd_user_id;

  return 'pending';
end;
$$;

revoke all on function public.dkd_apply_courier_license(text) from public;
grant execute on function public.dkd_apply_courier_license(text) to authenticated;

create or replace function public.dkd_courier_profile_me()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_profile public.dkd_profiles%rowtype;
  dkd_today_earnings numeric(12,2) := 0;
  dkd_week_earnings numeric(12,2) := 0;
  dkd_month_earnings numeric(12,2) := 0;
  dkd_avg_fee numeric(12,2) := 0;
  dkd_open_jobs integer := 0;
  dkd_completed_today integer := 0;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  select *
  into dkd_profile
  from public.dkd_profiles
  where user_id = dkd_user_id;

  select coalesce(sum(amount_tl), 0)::numeric(12,2)
  into dkd_today_earnings
  from public.dkd_courier_wallet_ledger
  where user_id = dkd_user_id
    and direction = 'credit'
    and created_at >= date_trunc('day', now());

  select coalesce(sum(amount_tl), 0)::numeric(12,2)
  into dkd_week_earnings
  from public.dkd_courier_wallet_ledger
  where user_id = dkd_user_id
    and direction = 'credit'
    and created_at >= date_trunc('week', now());

  select coalesce(sum(amount_tl), 0)::numeric(12,2)
  into dkd_month_earnings
  from public.dkd_courier_wallet_ledger
  where user_id = dkd_user_id
    and direction = 'credit'
    and created_at >= date_trunc('month', now());

  select coalesce(avg(nullif(fee_tl, 0)), 0)::numeric(12,2)
  into dkd_avg_fee
  from public.dkd_courier_jobs
  where assigned_user_id = dkd_user_id
    and status = 'completed';

  select count(*)
  into dkd_open_jobs
  from public.dkd_courier_jobs
  where assigned_user_id = dkd_user_id
    and status in ('open', 'accepted')
    and coalesce(is_active, true) = true;

  select count(*)
  into dkd_completed_today
  from public.dkd_courier_jobs
  where assigned_user_id = dkd_user_id
    and status = 'completed'
    and completed_at >= date_trunc('day', now());

  return jsonb_build_object(
    'status', coalesce(dkd_profile.courier_status, 'none'),
    'score', coalesce(dkd_profile.courier_score, 0),
    'completed_jobs', coalesce(dkd_profile.courier_completed_jobs, 0),
    'courier_xp', greatest(coalesce(dkd_profile.courier_xp, 0), coalesce(dkd_profile.courier_score, 0)),
    'courier_level', greatest(coalesce(dkd_profile.courier_level, 1), public.dkd_courier_level_from_xp(greatest(coalesce(dkd_profile.courier_xp, 0), coalesce(dkd_profile.courier_score, 0)))),
    'wallet_tl', coalesce(dkd_profile.courier_wallet_tl, 0),
    'total_earned_tl', coalesce(dkd_profile.courier_total_earned_tl, 0),
    'withdrawn_tl', coalesce(dkd_profile.courier_withdrawn_tl, 0),
    'available_tl', coalesce(dkd_profile.courier_wallet_tl, 0),
    'today_earnings_tl', coalesce(dkd_today_earnings, 0),
    'week_earnings_tl', coalesce(dkd_week_earnings, 0),
    'month_earnings_tl', coalesce(dkd_month_earnings, 0),
    'avg_fee_tl', coalesce(dkd_avg_fee, 0),
    'active_days', coalesce(dkd_profile.courier_active_days, 0),
    'cancelled_jobs', coalesce(dkd_profile.courier_cancelled_jobs, 0),
    'last_completed_at', dkd_profile.courier_last_completed_at,
    'fastest_eta_min', dkd_profile.courier_fastest_eta_min,
    'rating_avg', coalesce(dkd_profile.courier_rating_avg, 5.00),
    'rating_count', coalesce(dkd_profile.courier_rating_count, 0),
    'vehicle_type', coalesce(nullif(dkd_profile.courier_vehicle_type, ''), 'moto'),
    'city', coalesce(nullif(dkd_profile.courier_city, ''), 'Ankara'),
    'zone', coalesce(dkd_profile.courier_zone, ''),
    'badges', coalesce(dkd_profile.courier_badges, '[]'::jsonb),
    'meta', coalesce(dkd_profile.courier_profile_meta, '{}'::jsonb),
    'open_jobs', coalesce(dkd_open_jobs, 0),
    'completed_today', coalesce(dkd_completed_today, 0)
  );
end;
$$;

revoke all on function public.dkd_courier_profile_me() from public;
grant execute on function public.dkd_courier_profile_me() to authenticated;

create or replace function public.dkd_courier_job_complete(dkd_param_job_id bigint)
returns table (
  courier_score integer,
  courier_completed_jobs integer,
  courier_wallet_tl numeric,
  courier_total_earned_tl numeric,
  courier_active_days integer,
  courier_xp integer,
  courier_level integer,
  token integer,
  shards integer,
  courier_last_completed_at timestamptz,
  courier_fastest_eta_min integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_reward integer := 0;
  dkd_fee_tl numeric(12,2) := 0;
  dkd_eta_min integer := null;
  dkd_order_id bigint := null;
  dkd_job_id bigint := null;
  dkd_prev_last_completed_at timestamptz := null;
  dkd_prev_courier_xp integer := 0;
  dkd_next_courier_xp integer := 0;
  dkd_next_courier_level integer := 1;
  dkd_next_wallet numeric(12,2) := 0;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  select
    courier_last_completed_at,
    greatest(coalesce(courier_xp, 0), coalesce(courier_score, 0))
  into dkd_prev_last_completed_at, dkd_prev_courier_xp
  from public.dkd_profiles
  where user_id = dkd_user_id;

  update public.dkd_courier_jobs
  set status = 'completed',
      completed_at = now(),
      updated_at = now(),
      pickup_status = case when coalesce(pickup_status, 'pending') = 'pending' then 'picked_up' else pickup_status end,
      picked_up_at = coalesce(picked_up_at, now())
  where id = dkd_param_job_id
    and assigned_user_id = dkd_user_id
    and status in ('open', 'accepted')
    and coalesce(is_active, true) = true
  returning id, reward_score, coalesce(fee_tl, 0)::numeric(12,2), eta_min, order_id
  into dkd_job_id, dkd_reward, dkd_fee_tl, dkd_eta_min, dkd_order_id;

  if dkd_job_id is null then
    return;
  end if;

  dkd_next_courier_xp := greatest(coalesce(dkd_prev_courier_xp, 0), 0) + greatest(coalesce(dkd_reward, 0), 0) + 18;
  dkd_next_courier_level := public.dkd_courier_level_from_xp(dkd_next_courier_xp);

  update public.dkd_profiles
  set courier_status = case when courier_status = 'none' then 'approved' else courier_status end,
      courier_score = coalesce(courier_score, 0) + greatest(coalesce(dkd_reward, 0), 0),
      courier_completed_jobs = coalesce(courier_completed_jobs, 0) + 1,
      courier_wallet_tl = coalesce(courier_wallet_tl, 0) + greatest(coalesce(dkd_fee_tl, 0), 0),
      courier_total_earned_tl = coalesce(courier_total_earned_tl, 0) + greatest(coalesce(dkd_fee_tl, 0), 0),
      courier_last_completed_at = now(),
      courier_active_days = coalesce(courier_active_days, 0) + case
        when dkd_prev_last_completed_at is null then 1
        when date_trunc('day', dkd_prev_last_completed_at) = date_trunc('day', now()) then 0
        else 1
      end,
      courier_fastest_eta_min = case
        when dkd_eta_min is null then courier_fastest_eta_min
        when courier_fastest_eta_min is null then dkd_eta_min
        else least(courier_fastest_eta_min, dkd_eta_min)
      end,
      courier_xp = dkd_next_courier_xp,
      courier_level = greatest(coalesce(courier_level, 1), dkd_next_courier_level),
      updated_at = now()
  where user_id = dkd_user_id
  returning courier_wallet_tl into dkd_next_wallet;

  insert into public.dkd_courier_wallet_ledger (
    user_id,
    job_id,
    order_id,
    direction,
    source_type,
    amount_tl,
    balance_after_tl,
    note,
    meta
  ) values (
    dkd_user_id,
    dkd_job_id,
    dkd_order_id,
    'credit',
    'delivery_fee',
    greatest(coalesce(dkd_fee_tl, 0), 0),
    coalesce(dkd_next_wallet, 0),
    'Teslimat ücreti hesaba işlendi',
    jsonb_build_object(
      'reward_score', greatest(coalesce(dkd_reward, 0), 0),
      'eta_min', dkd_eta_min,
      'courier_xp_gain', greatest(coalesce(dkd_reward, 0), 0) + 18,
      'courier_level_preview_reward', jsonb_build_object(
        'token', 20 + (dkd_next_courier_level * 10),
        'shard', 1 + floor(dkd_next_courier_level / 2),
        'xp', 35 + (dkd_next_courier_level * 15)
      )
    )
  );

  return query
  select
    coalesce(dkd_alias_p.courier_score, 0),
    coalesce(dkd_alias_p.courier_completed_jobs, 0),
    coalesce(dkd_alias_p.courier_wallet_tl, 0)::numeric(12,2),
    coalesce(dkd_alias_p.courier_total_earned_tl, 0)::numeric(12,2),
    coalesce(dkd_alias_p.courier_active_days, 0),
    greatest(coalesce(dkd_alias_p.courier_xp, 0), coalesce(dkd_alias_p.courier_score, 0)),
    greatest(coalesce(dkd_alias_p.courier_level, 1), public.dkd_courier_level_from_xp(greatest(coalesce(dkd_alias_p.courier_xp, 0), coalesce(dkd_alias_p.courier_score, 0)))),
    coalesce(dkd_alias_p.token, 0),
    coalesce(dkd_alias_p.shards, 0),
    dkd_alias_p.courier_last_completed_at,
    dkd_alias_p.courier_fastest_eta_min
  from public.dkd_profiles dkd_alias_p
  where dkd_alias_p.user_id = dkd_user_id;
end;
$$;

revoke all on function public.dkd_courier_job_complete(bigint) from public;
grant execute on function public.dkd_courier_job_complete(bigint) to authenticated;

commit;
