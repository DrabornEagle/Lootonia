-- Lootonia Ally / Sohbet v2
-- 6 haneli rastgele Ally_ID + sosyal görünürlük + modern UI patch desteği

alter table public.dkd_profiles add column if not exists ally_id bigint;
alter table public.dkd_profiles add column if not exists ally_id_version integer;
alter table public.dkd_profiles add column if not exists social_status text not null default 'online';
alter table public.dkd_profiles add column if not exists social_last_seen_at timestamptz not null default now();

update public.dkd_profiles
set ally_id_version = 1
where ally_id_version is null;

create or replace function public.dkd_generate_ally_id()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_candidate bigint;
  dkd_exists boolean;
  dkd_try integer := 0;
begin
  loop
    dkd_try := dkd_try + 1;
    if dkd_try > 500 then
      raise exception 'ally_id_generation_failed';
    end if;

    dkd_candidate := floor(100000 + random() * 900000)::bigint;

    select exists(
      select 1
      from public.dkd_profiles dkd_alias_p
      where dkd_alias_p.ally_id = dkd_candidate
    ) into dkd_exists;

    if not dkd_exists then
      return dkd_candidate;
    end if;
  end loop;
end;
$$;

revoke all on function public.dkd_generate_ally_id() from public;
grant execute on function public.dkd_generate_ally_id() to authenticated;

do $$
declare
  dkd_profile_row record;
begin
  for dkd_profile_row in
    select dkd_alias_p.user_id
    from public.dkd_profiles dkd_alias_p
    where coalesce(dkd_alias_p.ally_id_version, 0) < 2
       or dkd_alias_p.ally_id is null
       or dkd_alias_p.ally_id < 100000
       or dkd_alias_p.ally_id > 999999
    order by dkd_alias_p.created_at nulls first, dkd_alias_p.user_id
  loop
    update public.dkd_profiles
    set ally_id = public.dkd_generate_ally_id(),
        ally_id_version = 2,
        social_last_seen_at = coalesce(social_last_seen_at, now())
    where user_id = dkd_profile_row.user_id;
  end loop;
end $$;

alter table public.dkd_profiles alter column ally_id set default public.dkd_generate_ally_id();
alter table public.dkd_profiles alter column ally_id_version set default 2;
alter table public.dkd_profiles alter column ally_id_version set not null;

create unique index if not exists idx_dkd_profiles_ally_id on public.dkd_profiles(ally_id);
create index if not exists idx_dkd_profiles_social_last_seen on public.dkd_profiles(social_last_seen_at desc);

create or replace function public.dkd_social_search_profiles(dkd_param_query text, dkd_param_limit integer default 12)
returns table (
  user_id uuid,
  ally_id bigint,
  nickname text,
  avatar_emoji text,
  level integer,
  rank_key text,
  social_status text,
  social_last_seen_at timestamptz,
  is_friend boolean,
  pending_sent boolean,
  pending_received boolean,
  request_id bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select auth.uid() as user_id,
           regexp_replace(coalesce(trim(dkd_param_query), ''), '[^0-9]', '', 'g') as digits,
           lower(coalesce(trim(dkd_param_query), '')) as q
  )
  select
    dkd_alias_p.user_id,
    dkd_alias_p.ally_id,
    coalesce(nullif(trim(dkd_alias_p.nickname), ''), 'Oyuncu') as nickname,
    coalesce(nullif(trim(dkd_alias_p.avatar_emoji), ''), '🦅') as avatar_emoji,
    coalesce(dkd_alias_p.level, 1) as level,
    coalesce(dkd_alias_p.rank_key, 'rookie') as rank_key,
    case when coalesce(dkd_alias_p.social_last_seen_at, now() - interval '365 days') >= now() - interval '3 minutes' then 'online' else 'away' end as social_status,
    dkd_alias_p.social_last_seen_at,
    exists (
      select 1
      from public.dkd_friendships dkd_alias_f
      where (dkd_alias_f.user_low = dkd_alias_p.user_id and dkd_alias_f.user_high = (select user_id from me))
         or (dkd_alias_f.user_high = dkd_alias_p.user_id and dkd_alias_f.user_low = (select user_id from me))
    ) as is_friend,
    exists (
      select 1
      from public.dkd_friend_requests dkd_alias_r
      where dkd_alias_r.requester_id = (select user_id from me)
        and dkd_alias_r.addressee_id = dkd_alias_p.user_id
        and dkd_alias_r.status = 'pending'
    ) as pending_sent,
    exists (
      select 1
      from public.dkd_friend_requests dkd_alias_r
      where dkd_alias_r.requester_id = dkd_alias_p.user_id
        and dkd_alias_r.addressee_id = (select user_id from me)
        and dkd_alias_r.status = 'pending'
    ) as pending_received,
    (
      select dkd_alias_r.id
      from public.dkd_friend_requests dkd_alias_r
      where dkd_alias_r.requester_id = dkd_alias_p.user_id
        and dkd_alias_r.addressee_id = (select user_id from me)
        and dkd_alias_r.status = 'pending'
      order by dkd_alias_r.created_at desc
      limit 1
    ) as request_id
  from public.dkd_profiles dkd_alias_p
  cross join me
  where me.user_id is not null
    and dkd_alias_p.user_id <> me.user_id
    and coalesce(trim(dkd_param_query), '') <> ''
    and (
      (me.digits <> '' and dkd_alias_p.ally_id::text = me.digits)
      or lower(coalesce(dkd_alias_p.nickname, '')) like ('%' || me.q || '%')
    )
  order by
    case when me.digits <> '' and dkd_alias_p.ally_id::text = me.digits then 0 else 1 end,
    case when lower(coalesce(dkd_alias_p.nickname, '')) = me.q then 0 else 1 end,
    dkd_alias_p.level desc,
    dkd_alias_p.updated_at desc
  limit greatest(1, least(coalesce(dkd_param_limit, 12), 20));
$$;

revoke all on function public.dkd_social_search_profiles(text, integer) from public;
grant execute on function public.dkd_social_search_profiles(text, integer) to authenticated;

create or replace function public.dkd_social_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_payload jsonb;
begin
  if dkd_user_id is null then
    return jsonb_build_object(
      'myProfile', null,
      'friends', '[]'::jsonb,
      'incoming', '[]'::jsonb,
      'outgoing', '[]'::jsonb
    );
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  update public.dkd_profiles
  set social_last_seen_at = now(),
      social_status = 'online'
  where user_id = dkd_user_id;

  with my_profile as (
    select
      dkd_alias_p.user_id,
      dkd_alias_p.ally_id,
      coalesce(nullif(trim(dkd_alias_p.nickname), ''), 'Oyuncu') as nickname,
      coalesce(nullif(trim(dkd_alias_p.avatar_emoji), ''), '🦅') as avatar_emoji,
      coalesce(dkd_alias_p.level, 1) as level,
      coalesce(dkd_alias_p.rank_key, 'rookie') as rank_key,
      'online'::text as social_status,
      dkd_alias_p.social_last_seen_at
    from public.dkd_profiles dkd_alias_p
    where dkd_alias_p.user_id = dkd_user_id
    limit 1
  ),
  friends as (
    select
      dkd_alias_f.id as friendship_id,
      othedkd_profile_row.user_id,
      other.ally_id,
      coalesce(nullif(trim(other.nickname), ''), 'Oyuncu') as nickname,
      coalesce(nullif(trim(other.avatar_emoji), ''), '🦅') as avatar_emoji,
      coalesce(other.level, 1) as level,
      coalesce(other.rank_key, 'rookie') as rank_key,
      case when coalesce(other.social_last_seen_at, now() - interval '365 days') >= now() - interval '3 minutes' then 'online' else 'away' end as social_status,
      other.social_last_seen_at,
      dkd_alias_t.id as thread_id,
      dkd_alias_t.last_message_text,
      dkd_alias_t.last_message_at,
      dkd_alias_f.created_at as friend_since,
      coalesce((
        select count(*)::integer
        from public.dkd_dm_messages m
        where m.thread_id = dkd_alias_t.id
          and m.sender_id <> dkd_user_id
          and m.seen_at is null
      ), 0) as unread_count
    from public.dkd_friendships dkd_alias_f
    join public.dkd_profiles other on othedkd_profile_row.user_id = case when dkd_alias_f.user_low = dkd_user_id then dkd_alias_f.user_high else dkd_alias_f.user_low end
    left join public.dkd_dm_threads dkd_alias_t on dkd_alias_t.friendship_id = dkd_alias_f.id
    where dkd_alias_f.user_low = dkd_user_id or dkd_alias_f.user_high = dkd_user_id
    order by coalesce(dkd_alias_t.last_message_at, dkd_alias_f.created_at) desc, other.nickname asc
  ),
  incoming as (
    select
      dkd_alias_r.id as request_id,
      sendedkd_profile_row.user_id,
      sender.ally_id,
      coalesce(nullif(trim(sender.nickname), ''), 'Oyuncu') as nickname,
      coalesce(nullif(trim(sender.avatar_emoji), ''), '🦅') as avatar_emoji,
      coalesce(sender.level, 1) as level,
      coalesce(sender.rank_key, 'rookie') as rank_key,
      case when coalesce(sender.social_last_seen_at, now() - interval '365 days') >= now() - interval '3 minutes' then 'online' else 'away' end as social_status,
      sender.social_last_seen_at,
      dkd_alias_r.created_at
    from public.dkd_friend_requests dkd_alias_r
    join public.dkd_profiles sender on sendedkd_profile_row.user_id = dkd_alias_r.requester_id
    where dkd_alias_r.addressee_id = dkd_user_id
      and dkd_alias_r.status = 'pending'
    order by dkd_alias_r.created_at desc
  ),
  outgoing as (
    select
      dkd_alias_r.id as request_id,
      receivedkd_profile_row.user_id,
      receiver.ally_id,
      coalesce(nullif(trim(receiver.nickname), ''), 'Oyuncu') as nickname,
      coalesce(nullif(trim(receiver.avatar_emoji), ''), '🦅') as avatar_emoji,
      coalesce(receiver.level, 1) as level,
      coalesce(receiver.rank_key, 'rookie') as rank_key,
      case when coalesce(receiver.social_last_seen_at, now() - interval '365 days') >= now() - interval '3 minutes' then 'online' else 'away' end as social_status,
      receiver.social_last_seen_at,
      dkd_alias_r.created_at
    from public.dkd_friend_requests dkd_alias_r
    join public.dkd_profiles receiver on receivedkd_profile_row.user_id = dkd_alias_r.addressee_id
    where dkd_alias_r.requester_id = dkd_user_id
      and dkd_alias_r.status = 'pending'
    order by dkd_alias_r.created_at desc
  )
  select jsonb_build_object(
    'myProfile', coalesce((select to_jsonb(my_profile) from my_profile), 'null'::jsonb),
    'friends', coalesce((select jsonb_agg(to_jsonb(friends)) from friends), '[]'::jsonb),
    'incoming', coalesce((select jsonb_agg(to_jsonb(incoming)) from incoming), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(to_jsonb(outgoing)) from outgoing), '[]'::jsonb)
  ) into dkd_payload;

  return coalesce(dkd_payload, jsonb_build_object(
    'myProfile', null,
    'friends', '[]'::jsonb,
    'incoming', '[]'::jsonb,
    'outgoing', '[]'::jsonb
  ));
end;
$$;

revoke all on function public.dkd_social_snapshot() from public;
grant execute on function public.dkd_social_snapshot() to authenticated;
