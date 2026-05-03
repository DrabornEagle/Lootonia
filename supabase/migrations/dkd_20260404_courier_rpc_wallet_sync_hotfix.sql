-- Kurye başvuru RPC no-arg fallback hotfix
-- Prefix kuralı: dkd_

create or replace function public.dkd_apply_courier_license()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_uid uuid := auth.uid();
begin
  begin
    return public.dkd_apply_courier_license(null::text);
  exception
    when undefined_function then
      if dkd_uid is null then
        raise exception 'Giriş bulunamadı';
      end if;

      update public.dkd_profiles
      set courier_status = 'pending',
          courier_city = coalesce(nullif(courier_city, ''), 'Ankara'),
          courier_zone = coalesce(nullif(courier_zone, ''), 'Genel Bölge')
      where user_id = dkd_uid;

      return 'pending';
  end;
end;
$$;

revoke all on function public.dkd_apply_courier_license() from public;
grant execute on function public.dkd_apply_courier_license() to authenticated;
