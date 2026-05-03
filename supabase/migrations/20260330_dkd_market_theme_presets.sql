begin;

alter table if exists public.dkd_market_ui_config
  add column if not exists hero_background_image_url text,
  add column if not exists hero_visual_preset text not null default 'aurora';

alter table if exists public.dkd_market_shop_defs
  add column if not exists visual_preset text not null default 'auto';

update public.dkd_market_ui_config
set hero_visual_preset = coalesce(nullif(trim(hero_visual_preset), ''), 'aurora')
where true;

update public.dkd_market_shop_defs
set visual_preset = coalesce(nullif(trim(visual_preset), ''), 'auto')
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
      hero_icon_accent,
      hero_background_image_url,
      hero_visual_preset
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
      visual_preset,
      price_token,
      reward_kind,
      reward_amount,
      sort_order,
      is_active
    from public.dkd_market_shop_defs
    order by sort_order asc, id asc
  ) as dkd_pack;

  return jsonb_build_object('ui', coalesce(dkd_ui, '{}'::jsonb), 'packs', coalesce(dkd_packs, '[]'::jsonb));
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
      hero_icon_accent,
      hero_background_image_url,
      hero_visual_preset
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
      visual_preset,
      price_token,
      reward_kind,
      reward_amount,
      sort_order,
      is_active
    from public.dkd_market_shop_defs
    where is_active = true
    order by sort_order asc, id asc
  ) as dkd_pack;

  return jsonb_build_object('ui', coalesce(dkd_ui, '{}'::jsonb), 'packs', coalesce(dkd_packs, '[]'::jsonb));
end;
$$;

revoke all on function public.dkd_market_shop_snapshot() from public;
grant execute on function public.dkd_market_shop_snapshot() to authenticated;

drop function if exists public.dkd_admin_market_ui_save(text, text, text, text, text, text, text);
drop function if exists public.dkd_admin_market_ui_save(text, text, text, text, text, text, text, text, text);

create function public.dkd_admin_market_ui_save(
  dkd_param_hero_kicker text,
  dkd_param_hero_title text,
  dkd_param_hero_subtitle text,
  dkd_param_logic_title text,
  dkd_param_logic_body text,
  dkd_param_hero_icon_name text,
  dkd_param_hero_icon_accent text,
  dkd_param_hero_background_image_url text,
  dkd_param_hero_visual_preset text
)
returns public.dkd_market_ui_config
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_market_ui_config;
  dkd_hero_visual_preset text;
begin
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'not_admin';
  end if;

  dkd_hero_visual_preset := lower(coalesce(trim(dkd_param_hero_visual_preset), 'aurora'));
  if dkd_hero_visual_preset not in ('aurora', 'neon', 'gold', 'frost') then
    dkd_hero_visual_preset := 'aurora';
  end if;

  insert into public.dkd_market_ui_config (
    id, hero_kicker, hero_title, hero_subtitle, logic_title, logic_body,
    hero_icon_name, hero_icon_accent, hero_background_image_url, hero_visual_preset, updated_at
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
    nullif(trim(dkd_param_hero_background_image_url), ''),
    dkd_hero_visual_preset,
    now()
  )
  on conflict (id) do update set
    hero_kicker = excluded.hero_kicker,
    hero_title = excluded.hero_title,
    hero_subtitle = excluded.hero_subtitle,
    logic_title = excluded.logic_title,
    logic_body = excluded.logic_body,
    hero_icon_name = excluded.hero_icon_name,
    hero_icon_accent = excluded.hero_icon_accent,
    hero_background_image_url = excluded.hero_background_image_url,
    hero_visual_preset = excluded.hero_visual_preset,
    updated_at = now()
  returning * into dkd_row;

  return dkd_row;
end;
$$;

revoke all on function public.dkd_admin_market_ui_save(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.dkd_admin_market_ui_save(text, text, text, text, text, text, text, text, text) to authenticated;

drop function if exists public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean);
drop function if exists public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean);

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
  dkd_param_visual_preset text,
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
  dkd_visual_preset text;
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

  dkd_visual_preset := lower(coalesce(trim(dkd_param_visual_preset), 'auto'));
  if dkd_visual_preset not in ('auto', 'aurora', 'neon', 'gold', 'frost') then
    dkd_visual_preset := 'auto';
  end if;

  if coalesce(nullif(trim(dkd_param_pack_key), ''), '') = '' then
    raise exception 'pack_key_required';
  end if;

  if coalesce(nullif(trim(dkd_param_title), ''), '') = '' then
    raise exception 'title_required';
  end if;

  if dkd_param_id is null then
    insert into public.dkd_market_shop_defs (
      pack_key, title, subtitle, description, badge_label, icon_name, accent_key,
      art_image_url, panel_style, background_tone, visual_preset,
      price_token, reward_kind, reward_amount, sort_order, is_active, updated_at
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
      dkd_visual_preset,
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
      visual_preset = dkd_visual_preset,
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

revoke all on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) from public;
grant execute on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) to authenticated;

commit;
