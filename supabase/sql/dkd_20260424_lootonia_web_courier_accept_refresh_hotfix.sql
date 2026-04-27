begin;

-- Web Kurye-Kargo: UUID ve numeric job id uyumlu kabul/al/teslim RPC düzeltmesi.
-- Amaç: "invalid input syntax for type bigint: <uuid>" hatasını kaldırmak.

drop function if exists public.dkd_web_courier_job_accept_dkd(bigint);
drop function if exists public.dkd_web_courier_job_accept_dkd(uuid);
drop function if exists public.dkd_web_courier_job_accept_dkd(text);

create function public.dkd_web_courier_job_accept_dkd(
  dkd_param_job_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_accept_text$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_has_courier_license_value boolean := false;
  dkd_job_key_value text := null;
  dkd_cargo_shipment_key_value text := null;
  dkd_order_key_value text := null;
  dkd_plate_value text := '';
  dkd_vehicle_value text := '';
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  dkd_job_key_value := nullif(trim(coalesce(dkd_param_job_id, '')), '');
  if dkd_job_key_value is null then
    return jsonb_build_object('ok', false, 'reason', 'job_id_required');
  end if;

  if to_regprocedure('public.dkd_web_courier_license_active_dkd(uuid)') is not null then
    dkd_has_courier_license_value := public.dkd_web_courier_license_active_dkd(dkd_user_id_value);
  else
    select lower(coalesce(dkd_profile_row.courier_status, 'none')) in ('approved', 'active', 'onayli', 'onaylı')
      into dkd_has_courier_license_value
    from public.dkd_profiles dkd_profile_row
    where dkd_profile_row.user_id = dkd_user_id_value
    limit 1;
  end if;

  if coalesce(dkd_has_courier_license_value, false) is not true then
    return jsonb_build_object('ok', false, 'reason', 'courier_license_required');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  select coalesce(nullif(trim(coalesce(dkd_profile_row.courier_profile_meta->>'plate_no', '')), ''), ''),
         coalesce(nullif(trim(coalesce(dkd_profile_row.courier_vehicle_type, '')), ''), nullif(trim(coalesce(dkd_profile_row.courier_profile_meta->>'vehicle_type', '')), ''), 'moto')
    into dkd_plate_value, dkd_vehicle_value
  from public.dkd_profiles dkd_profile_row
  where dkd_profile_row.user_id = dkd_user_id_value
  limit 1;

  update public.dkd_courier_jobs
     set assigned_user_id = dkd_user_id_value,
         status = 'accepted',
         accepted_at = coalesce(accepted_at, now()),
         pickup_status = case when coalesce(pickup_status, 'pending') = 'pending' then 'accepted' else pickup_status end,
         updated_at = now()
   where public.dkd_courier_jobs.id::text = dkd_job_key_value
     and (public.dkd_courier_jobs.assigned_user_id is null or public.dkd_courier_jobs.assigned_user_id = dkd_user_id_value)
     and coalesce(public.dkd_courier_jobs.status, 'open') in ('open', 'ready', 'published', 'accepted')
  returning public.dkd_courier_jobs.id::text,
            public.dkd_courier_jobs.cargo_shipment_id::text,
            public.dkd_courier_jobs.order_id::text
       into dkd_job_key_value, dkd_cargo_shipment_key_value, dkd_order_key_value;

  if dkd_job_key_value is null then
    return jsonb_build_object('ok', false, 'reason', 'job_not_available');
  end if;

  if nullif(trim(coalesce(dkd_cargo_shipment_key_value, '')), '') is not null then
    update public.dkd_cargo_shipments
       set status = 'accepted',
           assigned_courier_user_id = dkd_user_id_value,
           assigned_courier_plate_no = nullif(dkd_plate_value, ''),
           assigned_courier_vehicle_type = nullif(dkd_vehicle_value, ''),
           accepted_at = coalesce(accepted_at, now()),
           courier_eta_min = coalesce(courier_eta_min, 18),
           updated_at = now()
     where public.dkd_cargo_shipments.id::text = dkd_cargo_shipment_key_value;
  end if;

  return jsonb_build_object(
    'ok', true,
    'job_id', dkd_job_key_value,
    'cargo_shipment_id', dkd_cargo_shipment_key_value,
    'order_id', dkd_order_key_value
  );
end;
$dkd_accept_text$;

drop function if exists public.dkd_web_courier_job_picked_up_dkd(bigint);
drop function if exists public.dkd_web_courier_job_picked_up_dkd(uuid);
drop function if exists public.dkd_web_courier_job_picked_up_dkd(text);

create function public.dkd_web_courier_job_picked_up_dkd(
  dkd_param_job_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_pickup_text$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_job_key_value text := null;
  dkd_cargo_shipment_key_value text := null;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  dkd_job_key_value := nullif(trim(coalesce(dkd_param_job_id, '')), '');
  if dkd_job_key_value is null then
    return jsonb_build_object('ok', false, 'reason', 'job_id_required');
  end if;

  update public.dkd_courier_jobs
     set pickup_status = 'picked_up',
         status = 'picked_up',
         picked_up_at = coalesce(picked_up_at, now()),
         updated_at = now()
   where public.dkd_courier_jobs.id::text = dkd_job_key_value
     and public.dkd_courier_jobs.assigned_user_id = dkd_user_id_value
     and coalesce(public.dkd_courier_jobs.status, 'accepted') in ('accepted', 'assigned_courier', 'picked_up')
  returning public.dkd_courier_jobs.id::text,
            public.dkd_courier_jobs.cargo_shipment_id::text
       into dkd_job_key_value, dkd_cargo_shipment_key_value;

  if dkd_job_key_value is null then
    return jsonb_build_object('ok', false, 'reason', 'job_not_found');
  end if;

  if nullif(trim(coalesce(dkd_cargo_shipment_key_value, '')), '') is not null then
    update public.dkd_cargo_shipments
       set status = 'picked_up',
           picked_up_at = coalesce(picked_up_at, now()),
           updated_at = now()
     where public.dkd_cargo_shipments.id::text = dkd_cargo_shipment_key_value;
  end if;

  return jsonb_build_object('ok', true, 'job_id', dkd_job_key_value, 'cargo_shipment_id', dkd_cargo_shipment_key_value);
end;
$dkd_pickup_text$;

drop function if exists public.dkd_web_courier_job_complete_dkd(bigint);
drop function if exists public.dkd_web_courier_job_complete_dkd(uuid);
drop function if exists public.dkd_web_courier_job_complete_dkd(text);

create function public.dkd_web_courier_job_complete_dkd(
  dkd_param_job_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_complete_text$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_job_key_value text := null;
  dkd_cargo_shipment_key_value text := null;
  dkd_fee_value numeric(12,2) := 0;
  dkd_reward_score_value integer := 0;
  dkd_wallet_after_value numeric(12,2) := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  dkd_job_key_value := nullif(trim(coalesce(dkd_param_job_id, '')), '');
  if dkd_job_key_value is null then
    return jsonb_build_object('ok', false, 'reason', 'job_id_required');
  end if;

  update public.dkd_courier_jobs
     set status = 'completed',
         pickup_status = 'delivered',
         completed_at = coalesce(completed_at, now()),
         is_active = false,
         updated_at = now()
   where public.dkd_courier_jobs.id::text = dkd_job_key_value
     and public.dkd_courier_jobs.assigned_user_id = dkd_user_id_value
     and coalesce(public.dkd_courier_jobs.status, 'accepted') <> 'completed'
  returning public.dkd_courier_jobs.id::text,
            public.dkd_courier_jobs.cargo_shipment_id::text,
            coalesce(public.dkd_courier_jobs.fee_tl, 0),
            coalesce(public.dkd_courier_jobs.reward_score, 0)
       into dkd_job_key_value, dkd_cargo_shipment_key_value, dkd_fee_value, dkd_reward_score_value;

  if dkd_job_key_value is null then
    return jsonb_build_object('ok', false, 'reason', 'job_not_found');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  update public.dkd_profiles
     set courier_status = case when coalesce(courier_status, 'none') = 'none' then 'approved' else courier_status end,
         courier_score = coalesce(courier_score, 0) + greatest(coalesce(dkd_reward_score_value, 0), 0),
         courier_completed_jobs = coalesce(courier_completed_jobs, 0) + 1,
         courier_wallet_tl = coalesce(courier_wallet_tl, 0) + greatest(coalesce(dkd_fee_value, 0), 0),
         courier_total_earned_tl = coalesce(courier_total_earned_tl, 0) + greatest(coalesce(dkd_fee_value, 0), 0),
         updated_at = now()
   where public.dkd_profiles.user_id = dkd_user_id_value
  returning public.dkd_profiles.courier_wallet_tl into dkd_wallet_after_value;

  if nullif(trim(coalesce(dkd_cargo_shipment_key_value, '')), '') is not null then
    update public.dkd_cargo_shipments
       set status = 'completed',
           completed_at = coalesce(completed_at, now()),
           courier_fee_tl = case when coalesce(courier_fee_tl, 0) > 0 then courier_fee_tl else dkd_fee_value end,
           updated_at = now()
     where public.dkd_cargo_shipments.id::text = dkd_cargo_shipment_key_value;
  end if;

  return jsonb_build_object(
    'ok', true,
    'job_id', dkd_job_key_value,
    'cargo_shipment_id', dkd_cargo_shipment_key_value,
    'fee_tl', dkd_fee_value,
    'courier_wallet_tl', dkd_wallet_after_value
  );
end;
$dkd_complete_text$;

revoke all on function public.dkd_web_courier_job_accept_dkd(text) from public;
revoke all on function public.dkd_web_courier_job_picked_up_dkd(text) from public;
revoke all on function public.dkd_web_courier_job_complete_dkd(text) from public;

grant execute on function public.dkd_web_courier_job_accept_dkd(text) to authenticated;
grant execute on function public.dkd_web_courier_job_picked_up_dkd(text) to authenticated;
grant execute on function public.dkd_web_courier_job_complete_dkd(text) to authenticated;

commit;
