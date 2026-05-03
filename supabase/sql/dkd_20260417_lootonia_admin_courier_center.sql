begin;

create or replace function public.dkd_admin_courier_applications_list()
returns table (
  application_id bigint,
  user_id uuid,
  status text,
  city text,
  zone text,
  vehicle_type text,
  first_name text,
  last_name text,
  national_id text,
  phone text,
  email text,
  plate_no text,
  address_text text,
  emergency_name text,
  emergency_phone text,
  identity_front_url text,
  identity_back_url text,
  selfie_url text,
  driver_license_url text,
  vehicle_license_url text,
  insurance_url text,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  profile_nickname text,
  profile_avatar_emoji text,
  profile_courier_status text,
  profile_vehicle_type text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;

  return query
  select
    dkd_application_alias.id as application_id,
    dkd_application_alias.user_id,
    coalesce(dkd_application_alias.status, 'pending') as status,
    coalesce(dkd_application_alias.city, 'Ankara') as city,
    coalesce(dkd_application_alias.zone, '') as zone,
    coalesce(dkd_application_alias.vehicle_type, 'moto') as vehicle_type,
    coalesce(dkd_application_alias.first_name, '') as first_name,
    coalesce(dkd_application_alias.last_name, '') as last_name,
    coalesce(dkd_application_alias.national_id, '') as national_id,
    coalesce(dkd_application_alias.phone, '') as phone,
    coalesce(dkd_application_alias.email, '') as email,
    coalesce(dkd_application_alias.plate_no, '') as plate_no,
    coalesce(dkd_application_alias.address_text, '') as address_text,
    coalesce(dkd_application_alias.emergency_name, '') as emergency_name,
    coalesce(dkd_application_alias.emergency_phone, '') as emergency_phone,
    coalesce(dkd_application_alias.identity_front_url, '') as identity_front_url,
    coalesce(dkd_application_alias.identity_back_url, '') as identity_back_url,
    coalesce(dkd_application_alias.selfie_url, '') as selfie_url,
    coalesce(dkd_application_alias.driver_license_url, '') as driver_license_url,
    coalesce(dkd_application_alias.vehicle_license_url, '') as vehicle_license_url,
    coalesce(dkd_application_alias.insurance_url, '') as insurance_url,
    coalesce(dkd_application_alias.payload, '{}'::jsonb) as payload,
    dkd_application_alias.created_at,
    dkd_application_alias.updated_at,
    coalesce(dkd_profile_alias.nickname, '') as profile_nickname,
    coalesce(dkd_profile_alias.avatar_emoji, '') as profile_avatar_emoji,
    coalesce(dkd_profile_alias.courier_status, 'none') as profile_courier_status,
    coalesce(dkd_profile_alias.courier_vehicle_type, '') as profile_vehicle_type
  from public.dkd_courier_license_applications as dkd_application_alias
  left join public.dkd_profiles as dkd_profile_alias
    on dkd_profile_alias.user_id = dkd_application_alias.user_id
  order by
    case
      when coalesce(dkd_application_alias.status, 'pending') = 'pending' then 0
      when coalesce(dkd_application_alias.status, 'pending') = 'approved' then 1
      else 2
    end,
    coalesce(dkd_application_alias.updated_at, dkd_application_alias.created_at) desc,
    dkd_application_alias.id desc;
end;
$$;

revoke all on function public.dkd_admin_courier_applications_list() from public;
grant execute on function public.dkd_admin_courier_applications_list() to authenticated;

commit;
