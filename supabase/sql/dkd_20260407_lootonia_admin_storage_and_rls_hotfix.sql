begin;

create extension if not exists pgcrypto;

create table if not exists public.dkd_boss_defs (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.dkd_drops(id) on delete cascade,
  boss_key text not null,
  title text not null default 'Boss',
  subtitle text,
  description text,
  reward_summary text,
  ticket_cost integer not null default 1,
  boss_hp_display integer not null default 985000,
  art_image_url text,
  question_set jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dkd_boss_defs add column if not exists boss_key text;
alter table public.dkd_boss_defs add column if not exists title text;
alter table public.dkd_boss_defs add column if not exists subtitle text;
alter table public.dkd_boss_defs add column if not exists description text;
alter table public.dkd_boss_defs add column if not exists reward_summary text;
alter table public.dkd_boss_defs add column if not exists ticket_cost integer not null default 1;
alter table public.dkd_boss_defs add column if not exists boss_hp_display integer not null default 985000;
alter table public.dkd_boss_defs add column if not exists art_image_url text;
alter table public.dkd_boss_defs add column if not exists question_set jsonb not null default '[]'::jsonb;
alter table public.dkd_boss_defs add column if not exists is_active boolean not null default true;
alter table public.dkd_boss_defs add column if not exists created_at timestamptz not null default now();
alter table public.dkd_boss_defs add column if not exists updated_at timestamptz not null default now();

alter table public.dkd_card_defs add column if not exists serial_code text;
alter table public.dkd_card_defs add column if not exists art_image_url text;
alter table public.dkd_card_defs add column if not exists is_hidden_admin boolean not null default false;
alter table public.dkd_card_defs add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_dkd_boss_defs_drop_id_lookup on public.dkd_boss_defs(drop_id);
create index if not exists idx_dkd_card_defs_name_series_lookup on public.dkd_card_defs(lower(name), lower(series));
create index if not exists idx_dkd_card_defs_serial_code_lookup on public.dkd_card_defs(serial_code);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'lootonia-card-art', 'lootonia-card-art', true, 8388608, array['image/jpeg','image/png','image/webp','image/heic']
where not exists (select 1 from storage.buckets where id = 'lootonia-card-art');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'lootonia-boss-art', 'lootonia-boss-art', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic']
where not exists (select 1 from storage.buckets where id = 'lootonia-boss-art');

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia card art public read'
  ) then
    create policy "lootonia card art public read"
    on storage.objects for select
    to public
    using (bucket_id = 'lootonia-card-art');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia card art admin insert'
  ) then
    create policy "lootonia card art admin insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'lootonia-card-art' and coalesce(public.dkd_is_admin(), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia card art admin update'
  ) then
    create policy "lootonia card art admin update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'lootonia-card-art' and coalesce(public.dkd_is_admin(), false))
    with check (bucket_id = 'lootonia-card-art' and coalesce(public.dkd_is_admin(), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia card art admin delete'
  ) then
    create policy "lootonia card art admin delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'lootonia-card-art' and coalesce(public.dkd_is_admin(), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia boss art public read'
  ) then
    create policy "lootonia boss art public read"
    on storage.objects for select
    to public
    using (bucket_id = 'lootonia-boss-art');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia boss art admin insert'
  ) then
    create policy "lootonia boss art admin insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'lootonia-boss-art' and coalesce(public.dkd_is_admin(), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia boss art admin update'
  ) then
    create policy "lootonia boss art admin update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'lootonia-boss-art' and coalesce(public.dkd_is_admin(), false))
    with check (bucket_id = 'lootonia-boss-art' and coalesce(public.dkd_is_admin(), false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia boss art admin delete'
  ) then
    create policy "lootonia boss art admin delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'lootonia-boss-art' and coalesce(public.dkd_is_admin(), false));
  end if;
end $$;

create or replace function public.dkd_admin_card_upsert_flex(
  dkd_param_id_text text default null,
  dkd_param_name text default null,
  dkd_param_series text default null,
  dkd_param_serial_code text default null,
  dkd_param_rarity text default null,
  dkd_param_theme text default null,
  dkd_param_is_active boolean default true,
  dkd_param_art_image_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_card_defs%rowtype;
  dkd_existing_id text;
  dkd_now timestamptz := now();
  dkd_name text := coalesce(nullif(btrim(coalesce(dkd_param_name, '')), ''), 'Kart');
  dkd_series text := coalesce(nullif(upper(btrim(coalesce(dkd_param_series, ''))), ''), 'GENERAL');
  dkd_serial text := nullif(upper(btrim(coalesce(dkd_param_serial_code, ''))), '');
  dkd_rarity text := coalesce(nullif(lower(btrim(coalesce(dkd_param_rarity, ''))), ''), 'common');
  dkd_theme text := coalesce(nullif(btrim(coalesce(dkd_param_theme, '')), ''), 'City Core');
  dkd_art text := nullif(btrim(coalesce(dkd_param_art_image_url, '')), '');
begin
  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'admin_only';
  end if;

  update public.dkd_card_defs
  set name = dkd_name,
      series = dkd_series,
      serial_code = dkd_serial,
      rarity = dkd_rarity,
      theme = dkd_theme,
      is_active = coalesce(dkd_param_is_active, true),
      art_image_url = dkd_art,
      is_hidden_admin = false,
      updated_at = dkd_now
  where nullif(btrim(coalesce(dkd_param_id_text, '')), '') is not null
    and id::text = btrim(dkd_param_id_text)
  returning * into dkd_row;

  if dkd_row.id is null then
    select id::text into dkd_existing_id
    from public.dkd_card_defs
    where lower(name) = lower(dkd_name)
      and lower(series) = lower(dkd_series)
    order by created_at asc nulls last
    limit 1;

    if dkd_existing_id is not null then
      update public.dkd_card_defs
      set serial_code = dkd_serial,
          rarity = dkd_rarity,
          theme = dkd_theme,
          is_active = coalesce(dkd_param_is_active, true),
          art_image_url = dkd_art,
          is_hidden_admin = false,
          updated_at = dkd_now
      where id::text = dkd_existing_id
      returning * into dkd_row;
    else
      insert into public.dkd_card_defs (
        name, series, serial_code, rarity, theme, is_active, art_image_url, is_hidden_admin, created_at, updated_at
      ) values (
        dkd_name, dkd_series, dkd_serial, dkd_rarity, dkd_theme, coalesce(dkd_param_is_active, true), dkd_art, false, dkd_now, dkd_now
      )
      returning * into dkd_row;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', dkd_row.id,
    'name', dkd_row.name,
    'series', dkd_row.series,
    'serial_code', dkd_row.serial_code,
    'rarity', dkd_row.rarity,
    'theme', dkd_row.theme,
    'is_active', dkd_row.is_active,
    'art_image_url', dkd_row.art_image_url
  );
end;
$$;

revoke all on function public.dkd_admin_card_upsert_flex(text,text,text,text,text,text,boolean,text) from public;
grant execute on function public.dkd_admin_card_upsert_flex(text,text,text,text,text,text,boolean,text) to authenticated;

create or replace function public.dkd_admin_card_delete_hard(dkd_param_card_id_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_card_defs%rowtype;
begin
  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'admin_only';
  end if;

  select * into dkd_row
  from public.dkd_card_defs
  where id::text = btrim(coalesce(dkd_param_card_id_text, ''))
  limit 1;

  delete from public.dkd_market_listings
  where user_card_id in (
    select id from public.dkd_user_cards where card_def_id::text = btrim(coalesce(dkd_param_card_id_text, ''))
  );
  delete from public.dkd_user_cards where card_def_id::text = btrim(coalesce(dkd_param_card_id_text, ''));
  delete from public.dkd_loot_entries where card_def_id::text = btrim(coalesce(dkd_param_card_id_text, ''));
  delete from public.dkd_chest_history where card_def_id::text = btrim(coalesce(dkd_param_card_id_text, ''));
  delete from public.dkd_card_defs where id::text = btrim(coalesce(dkd_param_card_id_text, ''));

  return jsonb_build_object('ok', true, 'id', dkd_row.id, 'name', dkd_row.name);
end;
$$;

revoke all on function public.dkd_admin_card_delete_hard(text) from public;
grant execute on function public.dkd_admin_card_delete_hard(text) to authenticated;

create or replace function public.dkd_admin_boss_upsert(
  dkd_param_drop_id text,
  dkd_param_boss_key text default null,
  dkd_param_title text default null,
  dkd_param_subtitle text default null,
  dkd_param_description text default null,
  dkd_param_reward_summary text default null,
  dkd_param_ticket_cost integer default 1,
  dkd_param_boss_hp_display integer default 985000,
  dkd_param_art_image_url text default null,
  dkd_param_question_set jsonb default '[]'::jsonb,
  dkd_param_is_active boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_boss_defs%rowtype;
  dkd_now timestamptz := now();
  dkd_drop_id uuid;
  dkd_title text := coalesce(nullif(btrim(coalesce(dkd_param_title, '')), ''), 'Boss');
  dkd_boss_key text := coalesce(nullif(btrim(coalesce(dkd_param_boss_key, '')), ''), lower(regexp_replace(dkd_title, '[^a-zA-Z0-9]+', '-', 'g')));
begin
  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'admin_only';
  end if;

  if nullif(btrim(coalesce(dkd_param_drop_id, '')), '') is null then
    raise exception 'drop_id_required';
  end if;

  dkd_drop_id := btrim(dkd_param_drop_id)::uuid;

  update public.dkd_boss_defs
  set boss_key = dkd_boss_key,
      title = dkd_title,
      subtitle = nullif(btrim(coalesce(dkd_param_subtitle, '')), ''),
      description = nullif(btrim(coalesce(dkd_param_description, '')), ''),
      reward_summary = nullif(btrim(coalesce(dkd_param_reward_summary, '')), ''),
      ticket_cost = greatest(coalesce(dkd_param_ticket_cost, 1), 1),
      boss_hp_display = greatest(coalesce(dkd_param_boss_hp_display, 985000), 1),
      art_image_url = nullif(btrim(coalesce(dkd_param_art_image_url, '')), ''),
      question_set = coalesce(dkd_param_question_set, '[]'::jsonb),
      is_active = coalesce(dkd_param_is_active, true),
      updated_at = dkd_now
  where drop_id::text = dkd_drop_id::text
  returning * into dkd_row;

  if dkd_row.id is null then
    insert into public.dkd_boss_defs (
      drop_id, boss_key, title, subtitle, description, reward_summary, ticket_cost, boss_hp_display, art_image_url, question_set, is_active, created_at, updated_at
    ) values (
      dkd_drop_id,
      dkd_boss_key,
      dkd_title,
      nullif(btrim(coalesce(dkd_param_subtitle, '')), ''),
      nullif(btrim(coalesce(dkd_param_description, '')), ''),
      nullif(btrim(coalesce(dkd_param_reward_summary, '')), ''),
      greatest(coalesce(dkd_param_ticket_cost, 1), 1),
      greatest(coalesce(dkd_param_boss_hp_display, 985000), 1),
      nullif(btrim(coalesce(dkd_param_art_image_url, '')), ''),
      coalesce(dkd_param_question_set, '[]'::jsonb),
      coalesce(dkd_param_is_active, true),
      dkd_now,
      dkd_now
    )
    returning * into dkd_row;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', dkd_row.id,
    'drop_id', dkd_row.drop_id,
    'boss_key', dkd_row.boss_key,
    'title', dkd_row.title,
    'boss_hp_display', dkd_row.boss_hp_display,
    'art_image_url', dkd_row.art_image_url
  );
end;
$$;

revoke all on function public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,integer,text,jsonb,boolean) from public;
grant execute on function public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,integer,text,jsonb,boolean) to authenticated;

create or replace function public.dkd_admin_boss_delete(dkd_param_drop_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_boss_defs%rowtype;
begin
  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'admin_only';
  end if;

  delete from public.dkd_boss_defs
  where drop_id::text = btrim(coalesce(dkd_param_drop_id, ''))
  returning * into dkd_row;

  return jsonb_build_object('ok', true, 'id', dkd_row.id, 'drop_id', dkd_row.drop_id);
end;
$$;

revoke all on function public.dkd_admin_boss_delete(text) from public;
grant execute on function public.dkd_admin_boss_delete(text) to authenticated;

commit;
