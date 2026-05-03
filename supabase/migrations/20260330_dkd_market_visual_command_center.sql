begin;

create table if not exists public.dkd_market_ui_config (
  id integer primary key,
  hero_kicker text,
  hero_title text,
  hero_subtitle text,
  logic_title text,
  logic_body text,
  updated_at timestamptz not null default now()
);

create table if not exists public.dkd_market_shop_defs (
  id bigserial primary key,
  pack_key text not null unique,
  title text not null,
  subtitle text,
  description text,
  badge_label text,
  icon_name text not null default 'cube-outline',
  accent_key text not null default 'cyan',
  price_token integer not null default 0,
  reward_kind text,
  reward_amount integer not null default 1,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dkd_market_ui_config add column if not exists hero_icon_name text not null default 'shopping-outline';
alter table public.dkd_market_ui_config add column if not exists hero_icon_accent text not null default 'cyan';

alter table public.dkd_market_shop_defs add column if not exists art_image_url text;
alter table public.dkd_market_shop_defs add column if not exists panel_style text not null default 'featured';
alter table public.dkd_market_shop_defs add column if not exists background_tone text not null default 'auto';

update public.dkd_market_ui_config
set hero_icon_name = coalesce(nullif(trim(hero_icon_name), ''), 'shopping-outline'),
    hero_icon_accent = coalesce(nullif(trim(hero_icon_accent), ''), 'cyan')
where id = 1;

update public.dkd_market_shop_defs
set panel_style = coalesce(nullif(trim(panel_style), ''), 'featured'),
    background_tone = coalesce(nullif(trim(background_tone), ''), 'auto')
where true;

create or replace function public.dkd_admin_market_command_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_ui jsonb;
  dkd_packs jsonb;
begin
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'not_admin';
  end if;

  select to_jsonb(dkd_row)
  into dkd_ui
  from (
    select
      id,
      hero_kicker,
      hero_title,
      hero_subtitle,
      logic_title,
      logic_body,
      hero_icon_name,
      hero_icon_accent
    from public.dkd_market_ui_config
    where id = 1
  ) as dkd_row;

  select coalesce(jsonb_agg(to_jsonb(dkd_pack)), '[]'::jsonb)
  into dkd_packs
  from (
    select
      id,
      pack_key,
      title,
      subtitle,
      description,
      badge_label,
      icon_name,
      accent_key,
      art_image_url,
      panel_style,
      background_tone,
      price_token,
      reward_kind,
      reward_amount,
      sort_order,
      is_active
    from public.dkd_market_shop_defs
    order by sort_order asc, id asc
  ) as dkd_pack;

  return jsonb_build_object(
    'ui', coalesce(dkd_ui, '{}'::jsonb),
    'packs', coalesce(dkd_packs, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.dkd_admin_market_command_snapshot() from public;
grant execute on function public.dkd_admin_market_command_snapshot() to authenticated;

create or replace function public.dkd_market_shop_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_ui jsonb;
  dkd_packs jsonb;
begin
  select to_jsonb(dkd_row)
  into dkd_ui
  from (
    select
      id,
      hero_kicker,
      hero_title,
      hero_subtitle,
      logic_title,
      logic_body,
      hero_icon_name,
      hero_icon_accent
    from public.dkd_market_ui_config
    where id = 1
  ) as dkd_row;

  select coalesce(jsonb_agg(to_jsonb(dkd_pack)), '[]'::jsonb)
  into dkd_packs
  from (
    select
      id,
      pack_key,
      title,
      subtitle,
      description,
      badge_label,
      icon_name,
      accent_key,
      art_image_url,
      panel_style,
      background_tone,
      price_token,
      reward_kind,
      reward_amount,
      sort_order,
      is_active
    from public.dkd_market_shop_defs
    where is_active = true
    order by sort_order asc, id asc
  ) as dkd_pack;

  return jsonb_build_object(
    'ui', coalesce(dkd_ui, '{}'::jsonb),
    'packs', coalesce(dkd_packs, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.dkd_market_shop_snapshot() from public;
grant execute on function public.dkd_market_shop_snapshot() to authenticated;

drop function if exists public.dkd_admin_market_ui_save(text, text, text, text, text);
create function public.dkd_admin_market_ui_save(
  dkd_param_hero_kicker text,
  dkd_param_hero_title text,
  dkd_param_hero_subtitle text,
  dkd_param_logic_title text,
  dkd_param_logic_body text,
  dkd_param_hero_icon_name text,
  dkd_param_hero_icon_accent text
)
returns public.dkd_market_ui_config
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_market_ui_config;
begin
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'not_admin';
  end if;

  insert into public.dkd_market_ui_config (
    id,
    hero_kicker,
    hero_title,
    hero_subtitle,
    logic_title,
    logic_body,
    hero_icon_name,
    hero_icon_accent,
    updated_at
  )
  values (
    1,
    coalesce(nullif(trim(dkd_param_hero_kicker), ''), 'TOKEN MAĞAZASI'),
    coalesce(nullif(trim(dkd_param_hero_title), ''), 'Anında al, anında kullan'),
    coalesce(nullif(trim(dkd_param_hero_subtitle), ''), 'Token cüzdanınla shard, boss bileti ve enerji satın al. Her paket ne işe yaradığını açık şekilde gösterir.'),
    coalesce(nullif(trim(dkd_param_logic_title), ''), 'Paket mantığı'),
    coalesce(nullif(trim(dkd_param_logic_body), ''), 'Shard = craft ve upgrade, Bilet = boss girişi, Enerji = daha fazla drop ve sandık akışı.'),
    coalesce(nullif(trim(dkd_param_hero_icon_name), ''), 'shopping-outline'),
    coalesce(nullif(trim(dkd_param_hero_icon_accent), ''), 'cyan'),
    now()
  )
  on conflict (id) do update
  set
    hero_kicker = excluded.hero_kicker,
    hero_title = excluded.hero_title,
    hero_subtitle = excluded.hero_subtitle,
    logic_title = excluded.logic_title,
    logic_body = excluded.logic_body,
    hero_icon_name = excluded.hero_icon_name,
    hero_icon_accent = excluded.hero_icon_accent,
    updated_at = now()
  returning * into dkd_row;

  return dkd_row;
end;
$$;

revoke all on function public.dkd_admin_market_ui_save(text, text, text, text, text, text, text) from public;
grant execute on function public.dkd_admin_market_ui_save(text, text, text, text, text, text, text) to authenticated;

drop function if exists public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, integer, text, integer, integer, boolean);
create function public.dkd_admin_market_shop_upsert(
  dkd_param_id bigint,
  dkd_param_pack_key text,
  dkd_param_title text,
  dkd_param_subtitle text,
  dkd_param_description text,
  dkd_param_badge_label text,
  dkd_param_icon_name text,
  dkd_param_accent_key text,
  dkd_param_art_image_url text,
  dkd_param_panel_style text,
  dkd_param_background_tone text,
  dkd_param_price_token integer,
  dkd_param_reward_kind text,
  dkd_param_reward_amount integer,
  dkd_param_sort_order integer,
  dkd_param_is_active boolean
)
returns public.dkd_market_shop_defs
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_market_shop_defs;
  dkd_reward_kind text;
  dkd_panel_style text;
  dkd_background_tone text;
begin
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'not_admin';
  end if;

  dkd_reward_kind := lower(coalesce(trim(dkd_param_reward_kind), ''));
  if dkd_reward_kind = '' then
    raise exception 'invalid_reward_kind';
  end if;

  dkd_panel_style := lower(coalesce(trim(dkd_param_panel_style), 'featured'));
  if dkd_panel_style not in ('featured', 'minimal', 'compact') then
    dkd_panel_style := 'featured';
  end if;

  dkd_background_tone := lower(coalesce(trim(dkd_param_background_tone), 'auto'));
  if dkd_background_tone not in ('auto', 'midnight', 'sunset', 'emerald', 'violet') then
    dkd_background_tone := 'auto';
  end if;

  if coalesce(nullif(trim(dkd_param_pack_key), ''), '') = '' then
    raise exception 'pack_key_required';
  end if;

  if coalesce(nullif(trim(dkd_param_title), ''), '') = '' then
    raise exception 'title_required';
  end if;

  if dkd_param_id is null then
    insert into public.dkd_market_shop_defs (
      pack_key,
      title,
      subtitle,
      description,
      badge_label,
      icon_name,
      accent_key,
      art_image_url,
      panel_style,
      background_tone,
      price_token,
      reward_kind,
      reward_amount,
      sort_order,
      is_active,
      updated_at
    ) values (
      trim(dkd_param_pack_key),
      trim(dkd_param_title),
      nullif(trim(dkd_param_subtitle), ''),
      nullif(trim(dkd_param_description), ''),
      nullif(trim(dkd_param_badge_label), ''),
      coalesce(nullif(trim(dkd_param_icon_name), ''), 'cube-outline'),
      coalesce(nullif(trim(dkd_param_accent_key), ''), 'cyan'),
      nullif(trim(dkd_param_art_image_url), ''),
      dkd_panel_style,
      dkd_background_tone,
      greatest(coalesce(dkd_param_price_token, 0), 0),
      dkd_reward_kind,
      greatest(coalesce(dkd_param_reward_amount, 1), 1),
      coalesce(dkd_param_sort_order, 100),
      coalesce(dkd_param_is_active, true),
      now()
    ) returning * into dkd_row;
  else
    update public.dkd_market_shop_defs
    set
      pack_key = trim(dkd_param_pack_key),
      title = trim(dkd_param_title),
      subtitle = nullif(trim(dkd_param_subtitle), ''),
      description = nullif(trim(dkd_param_description), ''),
      badge_label = nullif(trim(dkd_param_badge_label), ''),
      icon_name = coalesce(nullif(trim(dkd_param_icon_name), ''), 'cube-outline'),
      accent_key = coalesce(nullif(trim(dkd_param_accent_key), ''), 'cyan'),
      art_image_url = nullif(trim(dkd_param_art_image_url), ''),
      panel_style = dkd_panel_style,
      background_tone = dkd_background_tone,
      price_token = greatest(coalesce(dkd_param_price_token, 0), 0),
      reward_kind = dkd_reward_kind,
      reward_amount = greatest(coalesce(dkd_param_reward_amount, 1), 1),
      sort_order = coalesce(dkd_param_sort_order, 100),
      is_active = coalesce(dkd_param_is_active, true),
      updated_at = now()
    where id = dkd_param_id
    returning * into dkd_row;
  end if;

  return dkd_row;
end;
$$;

revoke all on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) from public;
grant execute on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) to authenticated;

commit;
