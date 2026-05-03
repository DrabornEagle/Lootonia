-- 026_clan_shared_foundation.sql
-- Lootonia shared clan foundation
-- Amaç:
--   1) AsyncStorage tabanlı lonca çekirdeğini shared Supabase tablolarına taşımak
--   2) Tag ile katılım akışını açmak
--   3) Guest roster fallback ile mevcut UI'yi bozmadan gerçek multiplayer temeli kurmak

create extension if not exists pgcrypto;

create table if not exists public.dkd_clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  motto text,
  theme_key text not null default 'neon',
  leader_user_id uuid not null references auth.users(id) on delete cascade,
  guest_roster jsonb not null default '[]'::jsonb,
  mission_claims jsonb not null default '{}'::jsonb,
  recent_claims jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dkd_clans_name_len check (char_length(name) between 2 and 24),
  constraint dkd_clans_tag_len check (char_length(tag) between 2 and 4),
  constraint dkd_clans_theme_key_len check (char_length(theme_key) between 2 and 24)
);

alter table public.dkd_clans add column if not exists guest_roster jsonb not null default '[]'::jsonb;
alter table public.dkd_clans add column if not exists mission_claims jsonb not null default '{}'::jsonb;
alter table public.dkd_clans add column if not exists recent_claims jsonb not null default '[]'::jsonb;
alter table public.dkd_clans add column if not exists theme_key text not null default 'neon';
alter table public.dkd_clans add column if not exists motto text;
alter table public.dkd_clans add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_dkd_clans_tag_unique_upper on public.dkd_clans (upper(tag));
create index if not exists idx_dkd_clans_leader on public.dkd_clans (leader_user_id);

create trigger trg_dkd_clans_updated_at
before update on public.dkd_clans
for each row
execute function public.dkd_touch_updated_at();

create table if not exists public.dkd_clan_members (
  clan_id uuid not null references public.dkd_clans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null,
  role text not null default 'Üye',
  power integer not null default 0,
  weekly_score integer not null default 0,
  level integer not null default 1,
  rare text not null default 'Common',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clan_id, user_id),
  constraint dkd_clan_members_power_nonneg check (power >= 0),
  constraint dkd_clan_members_weekly_nonneg check (weekly_score >= 0),
  constraint dkd_clan_members_level_min check (level >= 1)
);

alter table public.dkd_clan_members add column if not exists alias text not null default 'Oyuncu';
alter table public.dkd_clan_members add column if not exists role text not null default 'Üye';
alter table public.dkd_clan_members add column if not exists power integer not null default 0;
alter table public.dkd_clan_members add column if not exists weekly_score integer not null default 0;
alter table public.dkd_clan_members add column if not exists level integer not null default 1;
alter table public.dkd_clan_members add column if not exists rare text not null default 'Common';
alter table public.dkd_clan_members add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_dkd_clan_members_user on public.dkd_clan_members (user_id);
create index if not exists idx_dkd_clan_members_clan on public.dkd_clan_members (clan_id);

create trigger trg_dkd_clan_members_updated_at
before update on public.dkd_clan_members
for each row
execute function public.dkd_touch_updated_at();

alter table public.dkd_clans enable row level security;
alter table public.dkd_clan_members enable row level security;

drop policy if exists "dkd_clans_select_authenticated" on public.dkd_clans;
create policy "dkd_clans_select_authenticated"
on public.dkd_clans
for select
to authenticated
using (true);

drop policy if exists "dkd_clans_insert_leader" on public.dkd_clans;
create policy "dkd_clans_insert_leader"
on public.dkd_clans
for insert
to authenticated
with check (leader_user_id = auth.uid());

drop policy if exists "dkd_clans_update_leader" on public.dkd_clans;
create policy "dkd_clans_update_leader"
on public.dkd_clans
for update
to authenticated
using (leader_user_id = auth.uid())
with check (leader_user_id = auth.uid());

drop policy if exists "dkd_clans_delete_leader" on public.dkd_clans;
create policy "dkd_clans_delete_leader"
on public.dkd_clans
for delete
to authenticated
using (leader_user_id = auth.uid());

drop policy if exists "dkd_clan_members_select_authenticated" on public.dkd_clan_members;
create policy "dkd_clan_members_select_authenticated"
on public.dkd_clan_members
for select
to authenticated
using (true);

drop policy if exists "dkd_clan_members_insert_self_or_leader" on public.dkd_clan_members;
create policy "dkd_clan_members_insert_self_or_leader"
on public.dkd_clan_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.dkd_clans dkd_alias_c
    where dkd_alias_c.id = clan_id
      and dkd_alias_c.leader_user_id = auth.uid()
  )
);

drop policy if exists "dkd_clan_members_update_self_or_leader" on public.dkd_clan_members;
create policy "dkd_clan_members_update_self_or_leader"
on public.dkd_clan_members
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.dkd_clans dkd_alias_c
    where dkd_alias_c.id = clan_id
      and dkd_alias_c.leader_user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.dkd_clans dkd_alias_c
    where dkd_alias_c.id = clan_id
      and dkd_alias_c.leader_user_id = auth.uid()
  )
);

drop policy if exists "dkd_clan_members_delete_self_or_leader" on public.dkd_clan_members;
create policy "dkd_clan_members_delete_self_or_leader"
on public.dkd_clan_members
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.dkd_clans dkd_alias_c
    where dkd_alias_c.id = clan_id
      and dkd_alias_c.leader_user_id = auth.uid()
  )
);
