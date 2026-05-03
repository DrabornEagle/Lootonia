-- 008_profile_helpers.sql
create or replace function public.dkd_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select dkd_alias_p.is_admin from public.dkd_profiles dkd_alias_p where dkd_alias_p.user_id = auth.uid()), false);
$$;

revoke all on function public.dkd_is_admin() from public;
grant execute on function public.dkd_is_admin() to authenticated;

create or replace function public.dkd_set_profile(
  dkd_param_nickname text default null,
  dkd_param_avatar_emoji text default null
)
returns public.dkd_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_uid uuid := auth.uid();
  dkd_var_row public.dkd_profiles;
begin
  if dkd_var_uid is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id, nickname, avatar_emoji)
  values (dkd_var_uid, nullif(trim(dkd_param_nickname), ''), coalesce(nullif(trim(dkd_param_avatar_emoji), ''), '🦅'))
  on conflict (user_id) do update
    set nickname = coalesce(nullif(trim(dkd_param_nickname), ''), public.dkd_profiles.nickname),
        avatar_emoji = coalesce(nullif(trim(dkd_param_avatar_emoji), ''), public.dkd_profiles.avatar_emoji),
        updated_at = now()
  returning * into dkd_var_row;

  return dkd_var_row;
end;
$$;

revoke all on function public.dkd_set_profile(text, text) from public;
grant execute on function public.dkd_set_profile(text, text) to authenticated;
