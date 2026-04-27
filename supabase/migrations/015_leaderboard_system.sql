-- 014_leaderboard_system.sql
-- TODO: metric hesap formülü, weekly close snapshot ve reward dağıtımı tamamlanmalı.

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
begin
  return jsonb_build_object('week_start', null, 'closed', false, 'rows', '[]'::jsonb);
end;
$$;

create or replace function public.dkd_admin_close_week(
  dkd_param_week_offset integer default -1,
  dkd_param_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.dkd_is_admin() then
    raise exception 'not_admin';
  end if;
  return jsonb_build_object('ok', false, 'reason', 'todo_admin_close_week');
end;
$$;

create or replace function public.dkd_claim_weekly_top_reward(dkd_param_metric text default 'token')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_claim_weekly_top_reward');
end;
$$;
