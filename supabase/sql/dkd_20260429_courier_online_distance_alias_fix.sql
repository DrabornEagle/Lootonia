create or replace function public.dkd_courier_online_set_dkd(
  dkd_param_online boolean,
  dkd_param_country text default 'Türkiye',
  dkd_param_city text default 'Ankara',
  dkd_param_region text default '',
  dkd_param_live_lat numeric default null,
  dkd_param_live_lng numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_is_approved_value boolean := false;
  dkd_assigned_job_id_value bigint := null;
begin
  if dkd_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  select coalesce(courier_status, '') = 'approved'
  into dkd_is_approved_value
  from public.dkd_profiles
  where user_id = dkd_user_id;

  if not coalesce(dkd_is_approved_value, false) then
    return jsonb_build_object('ok', false, 'reason', 'courier_not_approved');
  end if;

  if not coalesce(dkd_param_online, false) then
    update public.dkd_courier_jobs
    set assigned_user_id = null,
        status = 'open',
        dkd_auto_assigned_at = null,
        dkd_assignment_expires_at = null,
        updated_at = now()
    where assigned_user_id = dkd_user_id
      and coalesce(status, '') in ('dkd_auto_assigned', 'dkd_assigned_offer');

    update public.dkd_profiles
    set dkd_courier_online = false,
        dkd_courier_last_online_at = now(),
        dkd_courier_auto_assigned_job_id = null
    where user_id = dkd_user_id;

    return jsonb_build_object('ok', true, 'dkd_online', false, 'dkd_assigned_job_id', null);
  end if;

  update public.dkd_profiles
  set dkd_country = coalesce(nullif(trim(dkd_param_country), ''), 'Türkiye'),
      dkd_city = coalesce(nullif(trim(dkd_param_city), ''), 'Ankara'),
      dkd_region = coalesce(nullif(trim(dkd_param_region), ''), ''),
      courier_city = coalesce(nullif(trim(dkd_param_city), ''), 'Ankara'),
      courier_zone = coalesce(nullif(trim(dkd_param_region), ''), ''),
      dkd_courier_online = true,
      dkd_courier_online_country = coalesce(nullif(trim(dkd_param_country), ''), 'Türkiye'),
      dkd_courier_online_city = coalesce(nullif(trim(dkd_param_city), ''), 'Ankara'),
      dkd_courier_online_region = coalesce(nullif(trim(dkd_param_region), ''), ''),
      dkd_courier_online_lat = dkd_param_live_lat,
      dkd_courier_online_lng = dkd_param_live_lng,
      dkd_courier_last_online_at = now()
  where user_id = dkd_user_id;

  with dkd_candidate_job as (
    select dkd_job_row.id,
      case
        when dkd_param_live_lat is not null and dkd_param_live_lng is not null and dkd_job_row.pickup_lat is not null and dkd_job_row.pickup_lng is not null
        then public.dkd_distance_km_between(dkd_param_live_lat, dkd_param_live_lng, dkd_job_row.pickup_lat, dkd_job_row.pickup_lng)
        else null
      end as dkd_distance_value
    from public.dkd_courier_jobs dkd_job_row
    where dkd_job_row.assigned_user_id is null
      and coalesce(dkd_job_row.is_active, true) = true
      and coalesce(dkd_job_row.status, 'open') in ('open', 'ready', 'published')
      and public.dkd_region_match_dkd(dkd_job_row.dkd_country, dkd_job_row.dkd_city, dkd_job_row.dkd_region, dkd_param_country, dkd_param_city, dkd_param_region)
      and not public.dkd_jsonb_array_has_text_dkd(coalesce(dkd_job_row.cargo_meta, '{}'::jsonb)->'dkd_rejected_courier_user_ids', dkd_user_id::text)
    order by
      case
        when dkd_param_live_lat is not null and dkd_param_live_lng is not null and dkd_job_row.pickup_lat is not null and dkd_job_row.pickup_lng is not null then 0
        else 1
      end asc,
      case
        when dkd_param_live_lat is not null and dkd_param_live_lng is not null and dkd_job_row.pickup_lat is not null and dkd_job_row.pickup_lng is not null
        then public.dkd_distance_km_between(dkd_param_live_lat, dkd_param_live_lng, dkd_job_row.pickup_lat, dkd_job_row.pickup_lng)
        else null
      end asc,
      dkd_job_row.created_at asc
    limit 1
    for update skip locked
  )
  update public.dkd_courier_jobs dkd_target_job
  set assigned_user_id = dkd_user_id,
      status = 'dkd_assigned_offer',
      dkd_auto_assigned_at = now(),
      dkd_assignment_expires_at = now() + interval '4 minutes',
      cargo_meta = coalesce(dkd_target_job.cargo_meta, '{}'::jsonb)
        || jsonb_build_object(
          'dkd_auto_assigned_by', 'dkd_courier_online_set_dkd',
          'dkd_auto_assigned_to', dkd_user_id::text,
          'dkd_auto_assigned_country', dkd_param_country,
          'dkd_auto_assigned_city', dkd_param_city,
          'dkd_auto_assigned_region', dkd_param_region
        ),
      updated_at = now()
  from dkd_candidate_job
  where dkd_target_job.id = dkd_candidate_job.id
  returning dkd_target_job.id into dkd_assigned_job_id_value;

  update public.dkd_profiles
  set dkd_courier_auto_assigned_job_id = dkd_assigned_job_id_value
  where user_id = dkd_user_id;

  return jsonb_build_object(
    'ok', true,
    'dkd_online', true,
    'dkd_assigned_job_id', dkd_assigned_job_id_value,
    'dkd_country', dkd_param_country,
    'dkd_city', dkd_param_city,
    'dkd_region', dkd_param_region
  );
end;
$$;

revoke all on function public.dkd_courier_online_set_dkd(boolean, text, text, text, numeric, numeric) from public;
grant execute on function public.dkd_courier_online_set_dkd(boolean, text, text, text, numeric, numeric) to authenticated;
