alter table if exists public.dkd_boss_defs
  add column if not exists boss_hp_display integer;

update public.dkd_boss_defs
set boss_hp_display = greatest(coalesce(boss_hp_display, 985000), 1)
where boss_hp_display is null
   or boss_hp_display < 1;

alter table if exists public.dkd_boss_defs
  alter column boss_hp_display set default 985000;

-- Eski imzaları temizle

drop function if exists public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,text,jsonb,boolean);
drop function if exists public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,integer,text,jsonb,boolean);
drop function if exists public.dkd_admin_boss_upsert(text,text,text,text,integer,text,jsonb,boolean);
drop function if exists public.dkd_admin_boss_upsert(bigint,bigint,text,text,text,text,text,integer,text,jsonb,boolean);

create function public.dkd_admin_boss_upsert(
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
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_title text := coalesce(nullif(trim(dkd_param_title), ''), 'Boss');
  dkd_subtitle text := nullif(trim(coalesce(dkd_param_subtitle, '')), '');
  dkd_description text := nullif(trim(coalesce(dkd_param_description, '')), '');
  dkd_reward_summary text := nullif(trim(coalesce(dkd_param_reward_summary, '')), '');
  dkd_boss_key text := coalesce(nullif(trim(dkd_param_boss_key), ''), lower(regexp_replace(dkd_title, '[^a-zA-Z0-9]+', '-', 'g')));
  dkd_ticket_cost integer := greatest(coalesce(dkd_param_ticket_cost, 1), 1);
  dkd_boss_hp_display integer := greatest(coalesce(dkd_param_boss_hp_display, 985000), 1);
  dkd_art_image_url text := nullif(trim(coalesce(dkd_param_art_image_url, '')), '');
  dkd_question_set jsonb := coalesce(dkd_param_question_set, '[]'::jsonb);
  dkd_is_active boolean := coalesce(dkd_param_is_active, true);
  dkd_row public.dkd_boss_defs%rowtype;
begin
  if nullif(trim(coalesce(dkd_param_drop_id, '')), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'drop_id_required');
  end if;

  update public.dkd_boss_defs
  set boss_key = dkd_boss_key,
      title = dkd_title,
      subtitle = dkd_subtitle,
      description = dkd_description,
      reward_summary = dkd_reward_summary,
      ticket_cost = dkd_ticket_cost,
      boss_hp_display = dkd_boss_hp_display,
      art_image_url = dkd_art_image_url,
      question_set = dkd_question_set,
      is_active = dkd_is_active,
      updated_at = now()
  where drop_id = dkd_param_drop_id
  returning * into dkd_row;

  if dkd_row.id is null then
    insert into public.dkd_boss_defs (
      drop_id,
      boss_key,
      title,
      subtitle,
      description,
      reward_summary,
      ticket_cost,
      boss_hp_display,
      art_image_url,
      question_set,
      is_active,
      created_at,
      updated_at
    )
    values (
      dkd_param_drop_id,
      dkd_boss_key,
      dkd_title,
      dkd_subtitle,
      dkd_description,
      dkd_reward_summary,
      dkd_ticket_cost,
      dkd_boss_hp_display,
      dkd_art_image_url,
      dkd_question_set,
      dkd_is_active,
      now(),
      now()
    )
    returning * into dkd_row;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', dkd_row.id,
    'drop_id', dkd_row.drop_id,
    'boss_hp_display', dkd_row.boss_hp_display
  );
end;
$$;

revoke all on function public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,integer,text,jsonb,boolean) from public;
grant execute on function public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,integer,text,jsonb,boolean) to authenticated;
