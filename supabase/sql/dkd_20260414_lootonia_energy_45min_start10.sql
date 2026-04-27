begin;

alter table if exists public.dkd_profiles
  alter column energy set default 10;

alter table if exists public.dkd_profiles
  alter column energy_max set default 10;

create or replace function public.dkd__effective_energy(
  dkd_param_energy integer,
  dkd_param_energy_max integer,
  dkd_param_energy_updated_at timestamptz
)
returns integer
language sql
stable
set search_path = public
as $$
  select least(
    greatest(coalesce(dkd_param_energy_max, 0), 0),
    greatest(coalesce(dkd_param_energy, 0), 0)
    + floor(greatest(extract(epoch from (now() - coalesce(dkd_param_energy_updated_at, now()))), 0) / 2700.0)::integer
  );
$$;

update public.dkd_profiles
set
  energy_max = 10,
  energy = least(public.dkd__effective_energy(energy, energy_max, energy_updated_at), 10),
  energy_updated_at = now(),
  updated_at = now()
where
  coalesce(energy_max, 10) <> 10
  or coalesce(energy, 0) > 10;

commit;
