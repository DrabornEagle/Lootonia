alter table public.dkd_admin_broadcasts
  add column if not exists audience text not null default 'everyone',
  add column if not exists target_screen text not null default 'map';

create or replace function public.dkd_admin_queue_broadcast(
  dkd_param_title text,
  dkd_param_body text,
  dkd_param_sender_name text default 'DrabornEagle',
  dkd_param_audience text default 'everyone',
  dkd_param_target_screen text default 'map'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_uid uuid := auth.uid();
  dkd_var_id bigint;
  dkd_var_audience text := lower(coalesce(nullif(trim(coalesce(dkd_param_audience, '')), ''), 'everyone'));
  dkd_var_target_screen text := lower(coalesce(nullif(trim(coalesce(dkd_param_target_screen, '')), ''), 'map'));
begin
  if dkd_var_uid is null then
    raise exception 'auth_required';
  end if;
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;
  if nullif(trim(coalesce(dkd_param_title, '')), '') is null then
    raise exception 'title_required';
  end if;
  if nullif(trim(coalesce(dkd_param_body, '')), '') is null then
    raise exception 'body_required';
  end if;

  if dkd_var_audience not in ('everyone', 'new', 'courier', 'admin') then
    dkd_var_audience := 'everyone';
  end if;

  if dkd_var_target_screen not in ('map', 'tasks', 'leader', 'market', 'collection', 'courier', 'admin', 'scanner') then
    dkd_var_target_screen := 'map';
  end if;

  insert into public.dkd_admin_broadcasts(sender_name, title, body, sent_by, audience, target_screen)
  values (
    coalesce(nullif(trim(coalesce(dkd_param_sender_name, '')), ''), 'DrabornEagle'),
    trim(dkd_param_title),
    trim(dkd_param_body),
    dkd_var_uid,
    dkd_var_audience,
    dkd_var_target_screen
  )
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

grant execute on function public.dkd_admin_queue_broadcast(text, text, text, text, text) to authenticated;

create or replace function public.dkd_admin_list_active_push_tokens(dkd_param_audience text default 'everyone')
returns table(expo_push_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_audience text := lower(coalesce(nullif(trim(coalesce(dkd_param_audience, '')), ''), 'everyone'));
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;

  if dkd_var_audience = 'new' then
    return query
    select dkd_alias_t.expo_push_token
      from public.dkd_push_tokens dkd_alias_t
      join public.dkd_profiles dkd_alias_p on dkd_alias_p.user_id = dkd_alias_t.user_id
     where dkd_alias_t.is_active = true
       and dkd_alias_t.expo_push_token is not null
       and greatest(coalesce(dkd_alias_p.level, 1), 1) <= 2
     order by dkd_alias_t.id desc;
    return;
  end if;

  if dkd_var_audience = 'courier' then
    return query
    select dkd_alias_t.expo_push_token
      from public.dkd_push_tokens dkd_alias_t
      join public.dkd_profiles dkd_alias_p on dkd_alias_p.user_id = dkd_alias_t.user_id
     where dkd_alias_t.is_active = true
       and dkd_alias_t.expo_push_token is not null
       and coalesce(dkd_alias_p.courier_status, 'none') in ('approved', 'active')
     order by dkd_alias_t.id desc;
    return;
  end if;

  if dkd_var_audience = 'admin' then
    return query
    select dkd_alias_t.expo_push_token
      from public.dkd_push_tokens dkd_alias_t
      join auth.users dkd_alias_u on dkd_alias_u.id = dkd_alias_t.user_id
     where dkd_alias_t.is_active = true
       and dkd_alias_t.expo_push_token is not null
       and (
         coalesce(dkd_alias_u.raw_app_meta_data ->> 'role', '') = 'admin'
         or coalesce(dkd_alias_u.raw_user_meta_data ->> 'role', '') = 'admin'
         or coalesce(dkd_alias_u.raw_app_meta_data ->> 'is_admin', '') = 'true'
         or coalesce(dkd_alias_u.raw_user_meta_data ->> 'is_admin', '') = 'true'
       )
     order by dkd_alias_t.id desc;
    return;
  end if;

  return query
  select dkd_alias_t.expo_push_token
    from public.dkd_push_tokens dkd_alias_t
   where dkd_alias_t.is_active = true
     and dkd_alias_t.expo_push_token is not null
   order by dkd_alias_t.id desc;
end;
$$;

grant execute on function public.dkd_admin_list_active_push_tokens(text) to authenticated;
