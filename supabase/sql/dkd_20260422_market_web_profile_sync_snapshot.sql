begin;

create or replace function public.dkd_market_web_profile_sync_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_current_user_id uuid := auth.uid();
  dkd_profile_row public.dkd_profiles%rowtype;
begin
  if dkd_current_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_current_user_id)
  on conflict (user_id) do nothing;

  select *
  into dkd_profile_row
  from public.dkd_profiles
  where user_id = dkd_current_user_id
  limit 1;

  return jsonb_build_object(
    'user_id', dkd_profile_row.user_id,
    'nickname', coalesce(dkd_profile_row.nickname, ''),
    'avatar_emoji', coalesce(dkd_profile_row.avatar_emoji, ''),
    'avatar_image_url', coalesce(dkd_profile_row.avatar_image_url, ''),
    'token', coalesce(dkd_profile_row.token, 0),
    'shards', coalesce(dkd_profile_row.shards, 0),
    'boss_tickets', coalesce(dkd_profile_row.boss_tickets, 0),
    'energy', coalesce(dkd_profile_row.energy, 0),
    'energy_max', greatest(coalesce(dkd_profile_row.energy_max, 0), 0),
    'energy_updated_at', dkd_profile_row.energy_updated_at,
    'wallet_tl', coalesce(dkd_profile_row.wallet_tl, coalesce(dkd_profile_row.courier_wallet_tl, 0)),
    'courier_wallet_tl', coalesce(dkd_profile_row.courier_wallet_tl, 0),
    'updated_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.dkd_market_web_profile_sync_snapshot() from public;
grant execute on function public.dkd_market_web_profile_sync_snapshot() to authenticated;
grant execute on function public.dkd_market_web_profile_sync_snapshot() to service_role;

commit;
