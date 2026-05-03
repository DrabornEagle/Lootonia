begin;

alter table if exists public.dkd_boss_defs
  add column if not exists boss_hp_display integer;

update public.dkd_boss_defs
set boss_hp_display = 985000
where boss_hp_display is null or boss_hp_display <= 0;

alter table if exists public.dkd_boss_defs
  alter column boss_hp_display set default 985000;

-- Eski imzaları temizle
DROP FUNCTION IF EXISTS public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,text,jsonb,boolean);
DROP FUNCTION IF EXISTS public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,integer,text,jsonb,boolean);
DROP FUNCTION IF EXISTS public.dkd_admin_boss_upsert(bigint,bigint,text,text,text,text,text,integer,text,jsonb,boolean);
DROP FUNCTION IF EXISTS public.dkd_admin_boss_delete(text);
DROP FUNCTION IF EXISTS public.dkd_admin_boss_delete(uuid);

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
)
returns bigint
language plpgsql
security definer
set search_path = public
as $dkd_boss_upsert$
declare
  dkd_drop_uuid uuid;
  dkd_row_id bigint;
begin
  if dkd_param_drop_id is null or btrim(dkd_param_drop_id) = '' then
    raise exception 'boss_drop_required';
  end if;

  dkd_drop_uuid := dkd_param_drop_id::uuid;

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
    is_active
  ) values (
    dkd_drop_uuid,
    nullif(btrim(coalesce(dkd_param_boss_key, '')), ''),
    coalesce(nullif(btrim(coalesce(dkd_param_title, '')), ''), 'Boss'),
    nullif(btrim(coalesce(dkd_param_subtitle, '')), ''),
    nullif(btrim(coalesce(dkd_param_description, '')), ''),
    nullif(btrim(coalesce(dkd_param_reward_summary, '')), ''),
    greatest(coalesce(dkd_param_ticket_cost, 1), 1),
    greatest(coalesce(dkd_param_boss_hp_display, 985000), 1),
    nullif(btrim(coalesce(dkd_param_art_image_url, '')), ''),
    coalesce(dkd_param_question_set, '[]'::jsonb),
    coalesce(dkd_param_is_active, true)
  )
  on conflict (drop_id) do update set
    boss_key = excluded.boss_key,
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    reward_summary = excluded.reward_summary,
    ticket_cost = excluded.ticket_cost,
    boss_hp_display = excluded.boss_hp_display,
    art_image_url = excluded.art_image_url,
    question_set = excluded.question_set,
    is_active = excluded.is_active,
    updated_at = now()
  returning id into dkd_row_id;

  return dkd_row_id;
end;
$dkd_boss_upsert$;

grant execute on function public.dkd_admin_boss_upsert(text,text,text,text,text,text,integer,integer,text,jsonb,boolean) to authenticated;

create or replace function public.dkd_admin_boss_delete(dkd_param_drop_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $dkd_boss_delete$
declare
  dkd_drop_uuid uuid;
begin
  if dkd_param_drop_id is null or btrim(dkd_param_drop_id) = '' then
    raise exception 'boss_drop_required';
  end if;

  dkd_drop_uuid := dkd_param_drop_id::uuid;

  delete from public.dkd_boss_defs
  where drop_id = dkd_drop_uuid;

  return true;
end;
$dkd_boss_delete$;

grant execute on function public.dkd_admin_boss_delete(text) to authenticated;

commit;
