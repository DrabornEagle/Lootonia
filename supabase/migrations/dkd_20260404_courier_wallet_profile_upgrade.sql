begin;

alter table if exists public.dkd_profiles
  add column if not exists courier_wallet_tl numeric(12,2) not null default 0,
  add column if not exists courier_total_earned_tl numeric(12,2) not null default 0,
  add column if not exists courier_withdrawn_tl numeric(12,2) not null default 0,
  add column if not exists courier_active_days integer not null default 0,
  add column if not exists courier_cancelled_jobs integer not null default 0,
  add column if not exists courier_last_completed_at timestamptz,
  add column if not exists courier_fastest_eta_min integer,
  add column if not exists courier_rating_avg numeric(4,2) not null default 5.00,
  add column if not exists courier_rating_count integer not null default 0,
  add column if not exists courier_vehicle_type text not null default 'moto',
  add column if not exists courier_city text not null default 'Ankara',
  add column if not exists courier_zone text,
  add column if not exists courier_badges jsonb not null default '[]'::jsonb,
  add column if not exists courier_profile_meta jsonb not null default '{}'::jsonb;

create table if not exists public.dkd_courier_wallet_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id bigint references public.dkd_courier_jobs(id) on delete set null,
  order_id bigint,
  direction text not null default 'credit',
  source_type text not null default 'delivery_fee',
  amount_tl numeric(12,2) not null default 0,
  balance_after_tl numeric(12,2) not null default 0,
  note text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dkd_courier_wallet_ledger_user_created
  on public.dkd_courier_wallet_ledger(user_id, created_at desc);

create index if not exists idx_dkd_courier_wallet_ledger_job
  on public.dkd_courier_wallet_ledger(job_id);

alter table public.dkd_courier_wallet_ledger enable row level security;

drop policy if exists dkd_courier_wallet_ledger_select_own on public.dkd_courier_wallet_ledger;
create policy dkd_courier_wallet_ledger_select_own
on public.dkd_courier_wallet_ledger
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.dkd_courier_job_history_me(dkd_param_limit integer default 40)
returns table (
  id bigint,
  title text,
  merchant_name text,
  product_title text,
  pickup text,
  dropoff text,
  fee_tl numeric,
  reward_score integer,
  status text,
  pickup_status text,
  distance_km numeric,
  eta_min integer,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    j.id,
    coalesce(nullif(j.title, ''), concat(coalesce(j.merchant_name, 'İşletme'), ' teslimatı')) as title,
    coalesce(j.merchant_name, 'İşletme') as merchant_name,
    coalesce(j.product_title, 'Ürün') as product_title,
    coalesce(j.pickup, j.business_address_text, 'İşletme') as pickup,
    coalesce(j.dropoff, j.delivery_address_text, 'Teslimat adresi') as dropoff,
    coalesce(j.fee_tl, 0)::numeric(12,2) as fee_tl,
    coalesce(j.reward_score, 0) as reward_score,
    coalesce(j.status, 'open') as status,
    coalesce(j.pickup_status, 'pending') as pickup_status,
    coalesce(j.distance_km, 0)::numeric as distance_km,
    coalesce(j.eta_min, 0) as eta_min,
    j.accepted_at,
    j.picked_up_at,
    j.completed_at,
    j.created_at
  from public.dkd_courier_jobs j
  where j.assigned_user_id = auth.uid()
  order by coalesce(j.completed_at, j.updated_at, j.created_at) desc
  limit greatest(coalesce(dkd_param_limit, 40), 1);
$$;

revoke all on function public.dkd_courier_job_history_me(integer) from public;
grant execute on function public.dkd_courier_job_history_me(integer) to authenticated;

create or replace function public.dkd_courier_wallet_ledger_me(dkd_param_limit integer default 50)
returns table (
  id bigint,
  direction text,
  source_type text,
  amount_tl numeric,
  balance_after_tl numeric,
  note text,
  job_id bigint,
  order_id bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    dkd_alias_l.id,
    dkd_alias_l.direction,
    dkd_alias_l.source_type,
    coalesce(dkd_alias_l.amount_tl, 0)::numeric(12,2) as amount_tl,
    coalesce(dkd_alias_l.balance_after_tl, 0)::numeric(12,2) as balance_after_tl,
    coalesce(dkd_alias_l.note, '') as note,
    dkd_alias_l.job_id,
    dkd_alias_l.order_id,
    dkd_alias_l.created_at
  from public.dkd_courier_wallet_ledger dkd_alias_l
  where dkd_alias_l.user_id = auth.uid()
  order by dkd_alias_l.created_at desc
  limit greatest(coalesce(dkd_param_limit, 50), 1);
$$;

revoke all on function public.dkd_courier_wallet_ledger_me(integer) from public;
grant execute on function public.dkd_courier_wallet_ledger_me(integer) to authenticated;

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

create or replace function public.dkd_courier_wallet_withdraw(
  dkd_param_amount_tl numeric,
  dkd_param_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_amount numeric(12,2) := round(greatest(coalesce(dkd_param_amount_tl, 0), 0)::numeric, 2);
  dkd_balance numeric(12,2) := 0;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  if dkd_amount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  end if;

  update public.dkd_profiles
  set courier_wallet_tl = greatest(coalesce(courier_wallet_tl, 0) - dkd_amount, 0),
      courier_withdrawn_tl = coalesce(courier_withdrawn_tl, 0) + dkd_amount,
      updated_at = now()
  where user_id = dkd_user_id
    and coalesce(courier_wallet_tl, 0) >= dkd_amount
  returning courier_wallet_tl into dkd_balance;

  if dkd_balance is null then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_balance');
  end if;

  insert into public.dkd_courier_wallet_ledger (
    user_id,
    direction,
    source_type,
    amount_tl,
    balance_after_tl,
    note,
    meta
  ) values (
    dkd_user_id,
    'debit',
    'withdraw',
    dkd_amount,
    dkd_balance,
    nullif(trim(coalesce(dkd_param_note, '')), ''),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'ok', true,
    'withdrawn_tl', dkd_amount,
    'balance_after_tl', dkd_balance
  );
end;
$$;

revoke all on function public.dkd_courier_wallet_withdraw(numeric, text) from public;
grant execute on function public.dkd_courier_wallet_withdraw(numeric, text) to authenticated;

drop function if exists public.dkd_courier_job_complete(bigint);
create function public.dkd_courier_job_complete(dkd_param_job_id bigint)
returns table(
  courier_score integer,
  courier_completed_jobs integer,
  courier_wallet_tl numeric,
  courier_total_earned_tl numeric,
  courier_active_days integer
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
  dkd_next_wallet numeric(12,2) := 0;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  select courier_last_completed_at
  into dkd_prev_last_completed_at
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
      'eta_min', dkd_eta_min
    )
  );

  return query
  select
    coalesce(dkd_alias_p.courier_score, 0),
    coalesce(dkd_alias_p.courier_completed_jobs, 0),
    coalesce(dkd_alias_p.courier_wallet_tl, 0)::numeric(12,2),
    coalesce(dkd_alias_p.courier_total_earned_tl, 0)::numeric(12,2),
    coalesce(dkd_alias_p.courier_active_days, 0)
  from public.dkd_profiles dkd_alias_p
  where dkd_alias_p.user_id = dkd_user_id;
end;
$$;

revoke all on function public.dkd_courier_job_complete(bigint) from public;
grant execute on function public.dkd_courier_job_complete(bigint) to authenticated;

commit;
