begin;

alter table if exists public.dkd_profiles
  add column if not exists avatar_image_url text;

alter table if exists public.dkd_profiles
  add column if not exists wallet_tl numeric not null default 0;

alter table if exists public.dkd_profiles
  add column if not exists courier_wallet_tl numeric not null default 0;

create or replace function public.dkd_web_profile_save_dkd(
  dkd_nickname_value text default null,
  dkd_avatar_image_url_value text default null,
  dkd_avatar_emoji_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_current_user_id_value uuid := auth.uid();
  dkd_clean_nickname_value text := nullif(trim(coalesce(dkd_nickname_value, '')), '');
  dkd_clean_avatar_image_url_value text := nullif(trim(coalesce(dkd_avatar_image_url_value, '')), '');
  dkd_clean_avatar_emoji_value text := nullif(trim(coalesce(dkd_avatar_emoji_value, '')), '');
  dkd_profile_payload_value jsonb;
begin
  if dkd_current_user_id_value is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (
    user_id,
    nickname,
    avatar_emoji,
    avatar_image_url
  ) values (
    dkd_current_user_id_value,
    dkd_clean_nickname_value,
    coalesce(dkd_clean_avatar_emoji_value, '🦅'),
    coalesce(dkd_clean_avatar_image_url_value, '')
  )
  on conflict (user_id) do update set
    nickname = coalesce(dkd_clean_nickname_value, public.dkd_profiles.nickname),
    avatar_emoji = coalesce(dkd_clean_avatar_emoji_value, public.dkd_profiles.avatar_emoji),
    avatar_image_url = case
      when dkd_avatar_image_url_value is null then public.dkd_profiles.avatar_image_url
      else coalesce(dkd_clean_avatar_image_url_value, '')
    end,
    updated_at = now();

  select jsonb_build_object(
    'user_id', public.dkd_profiles.user_id,
    'nickname', coalesce(public.dkd_profiles.nickname, ''),
    'avatar_emoji', coalesce(public.dkd_profiles.avatar_emoji, ''),
    'avatar_image_url', coalesce(public.dkd_profiles.avatar_image_url, ''),
    'token', coalesce(public.dkd_profiles.token, 0),
    'shards', coalesce(public.dkd_profiles.shards, 0),
    'boss_tickets', coalesce(public.dkd_profiles.boss_tickets, 0),
    'energy', coalesce(public.dkd_profiles.energy, 0),
    'energy_max', greatest(coalesce(public.dkd_profiles.energy_max, 0), 0),
    'energy_updated_at', public.dkd_profiles.energy_updated_at,
    'wallet_tl', coalesce(public.dkd_profiles.wallet_tl, coalesce(public.dkd_profiles.courier_wallet_tl, 0)),
    'courier_wallet_tl', coalesce(public.dkd_profiles.courier_wallet_tl, 0),
    'updated_at', timezone('utc', now())
  )
  into dkd_profile_payload_value
  from public.dkd_profiles
  where public.dkd_profiles.user_id = dkd_current_user_id_value
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'profile', coalesce(dkd_profile_payload_value, '{}'::jsonb)
  );
end;
$$;

create or replace function public.dkd_web_business_owner_status_dkd()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_current_user_id_value uuid := auth.uid();
  dkd_business_count_value integer := 0;
  dkd_created_business_count_value integer := 0;
  dkd_primary_business_name_value text := '';
  dkd_has_created_by_column_value boolean := false;
begin
  if dkd_current_user_id_value is null then
    return jsonb_build_object(
      'is_business_owner', false,
      'business_count', 0,
      'primary_business_name', ''
    );
  end if;

  if to_regclass('public.dkd_businesses') is null then
    return jsonb_build_object(
      'is_business_owner', false,
      'business_count', 0,
      'primary_business_name', ''
    );
  end if;

  if to_regclass('public.dkd_business_memberships') is not null then
    select
      count(distinct public.dkd_businesses.id)::integer,
      coalesce(min(public.dkd_businesses.name), '')
    into dkd_business_count_value, dkd_primary_business_name_value
    from public.dkd_businesses
    join public.dkd_business_memberships
      on public.dkd_business_memberships.business_id = public.dkd_businesses.id
    where public.dkd_business_memberships.user_id = dkd_current_user_id_value
      and coalesce(public.dkd_business_memberships.is_active, true) is true
      and coalesce(public.dkd_business_memberships.role_key, '') in ('owner', 'manager')
      and coalesce(public.dkd_businesses.is_active, true) is true;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dkd_businesses'
      and column_name = 'created_by'
  )
  into dkd_has_created_by_column_value;

  if dkd_has_created_by_column_value is true then
    execute '
      select count(id)::integer, coalesce(min(name), '''')
      from public.dkd_businesses
      where coalesce(is_active, true) is true
        and created_by = $1
    '
    into dkd_created_business_count_value, dkd_primary_business_name_value
    using dkd_current_user_id_value;

    dkd_business_count_value := greatest(coalesce(dkd_business_count_value, 0), coalesce(dkd_created_business_count_value, 0));
  end if;

  return jsonb_build_object(
    'is_business_owner', coalesce(dkd_business_count_value, 0) > 0,
    'business_count', coalesce(dkd_business_count_value, 0),
    'primary_business_name', coalesce(dkd_primary_business_name_value, '')
  );
end;
$$;

revoke all on function public.dkd_web_profile_save_dkd(text, text, text) from public;
grant execute on function public.dkd_web_profile_save_dkd(text, text, text) to authenticated;
grant execute on function public.dkd_web_profile_save_dkd(text, text, text) to service_role;

revoke all on function public.dkd_web_business_owner_status_dkd() from public;
grant execute on function public.dkd_web_business_owner_status_dkd() to authenticated;
grant execute on function public.dkd_web_business_owner_status_dkd() to service_role;

commit;
