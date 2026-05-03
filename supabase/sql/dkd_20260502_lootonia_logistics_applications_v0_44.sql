-- DKD Lootonia v0.44
-- Nakliye/Lojistik başvuru, iş, teklif ve çevrimiçi görüşme çekirdek Supabase kurulumu.

alter table if exists public.dkd_profiles
  add column if not exists dkd_logistics_status text not null default 'none',
  add column if not exists dkd_logistics_profile_meta jsonb not null default '{}'::jsonb;

create table if not exists public.dkd_logistics_applications (
  id bigserial primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  dkd_application_type text not null default 'logistics',
  dkd_status text not null default 'pending' check (dkd_status in ('none','pending','approved','rejected','cancelled')),
  dkd_first_name text,
  dkd_last_name text,
  dkd_company_name text,
  dkd_national_id text,
  dkd_tax_no text,
  dkd_phone_text text,
  dkd_email_text text,
  dkd_city text,
  dkd_district text,
  dkd_operation_radius_km numeric default 25,
  dkd_vehicle_type text,
  dkd_vehicle_plate text,
  dkd_vehicle_capacity_kg numeric default 0,
  dkd_vehicle_volume_m3 numeric default 0,
  dkd_fleet_count integer default 1,
  dkd_service_tags text,
  dkd_experience_text text,
  dkd_address_text text,
  dkd_reference_text text,
  dkd_document_note text,
  dkd_payload jsonb not null default '{}'::jsonb,
  dkd_admin_note text,
  dkd_created_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now()
);

create table if not exists public.dkd_logistics_jobs (
  id bigserial primary key,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_status text not null default 'open' check (dkd_status in ('open','offer','negotiation','accepted','cancelled','completed')),
  dkd_customer_name text,
  dkd_customer_phone text,
  dkd_pickup_address text,
  dkd_dropoff_address text,
  dkd_pickup_floor text,
  dkd_dropoff_floor text,
  dkd_has_elevator text,
  dkd_cargo_type text,
  dkd_weight_kg numeric default 0,
  dkd_volume_m3 numeric default 0,
  dkd_helper_count integer default 0,
  dkd_vehicle_need text,
  dkd_budget_min_tl numeric default 0,
  dkd_budget_max_tl numeric default 0,
  dkd_scheduled_at text,
  dkd_note text,
  dkd_created_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now()
);

create table if not exists public.dkd_logistics_offers (
  id bigserial primary key,
  dkd_job_id bigint not null references public.dkd_logistics_jobs(id) on delete cascade,
  transporter_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_transporter_name text,
  dkd_price_tl numeric not null default 0,
  dkd_note text,
  dkd_status text not null default 'offered' check (dkd_status in ('offered','negotiation','accepted','rejected','cancelled')),
  dkd_created_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now()
);

create table if not exists public.dkd_logistics_messages (
  id bigserial primary key,
  dkd_job_id bigint not null references public.dkd_logistics_jobs(id) on delete cascade,
  dkd_sender_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_sender_name text,
  dkd_message_text text not null,
  dkd_created_at timestamptz not null default now()
);

create index if not exists dkd_logistics_applications_status_idx on public.dkd_logistics_applications(dkd_status);
create index if not exists dkd_logistics_jobs_status_idx on public.dkd_logistics_jobs(dkd_status);
create index if not exists dkd_logistics_jobs_customer_idx on public.dkd_logistics_jobs(customer_user_id);
create index if not exists dkd_logistics_offers_job_idx on public.dkd_logistics_offers(dkd_job_id);
create index if not exists dkd_logistics_messages_job_idx on public.dkd_logistics_messages(dkd_job_id);

alter table public.dkd_logistics_applications enable row level security;
alter table public.dkd_logistics_jobs enable row level security;
alter table public.dkd_logistics_offers enable row level security;
alter table public.dkd_logistics_messages enable row level security;

drop policy if exists dkd_logistics_applications_select_dkd on public.dkd_logistics_applications;
create policy dkd_logistics_applications_select_dkd on public.dkd_logistics_applications
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.dkd_is_admin()
  );

drop policy if exists dkd_logistics_applications_insert_dkd on public.dkd_logistics_applications;
create policy dkd_logistics_applications_insert_dkd on public.dkd_logistics_applications
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists dkd_logistics_applications_update_dkd on public.dkd_logistics_applications;
create policy dkd_logistics_applications_update_dkd on public.dkd_logistics_applications
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.dkd_is_admin()
  )
  with check (
    user_id = auth.uid()
    or public.dkd_is_admin()
  );

drop policy if exists dkd_logistics_jobs_select_dkd on public.dkd_logistics_jobs;
create policy dkd_logistics_jobs_select_dkd on public.dkd_logistics_jobs
  for select to authenticated
  using (true);

drop policy if exists dkd_logistics_jobs_insert_dkd on public.dkd_logistics_jobs;
create policy dkd_logistics_jobs_insert_dkd on public.dkd_logistics_jobs
  for insert to authenticated
  with check (customer_user_id = auth.uid());

drop policy if exists dkd_logistics_jobs_update_dkd on public.dkd_logistics_jobs;
create policy dkd_logistics_jobs_update_dkd on public.dkd_logistics_jobs
  for update to authenticated
  using (customer_user_id = auth.uid())
  with check (customer_user_id = auth.uid());

drop policy if exists dkd_logistics_offers_select_dkd on public.dkd_logistics_offers;
create policy dkd_logistics_offers_select_dkd on public.dkd_logistics_offers
  for select to authenticated
  using (true);

drop policy if exists dkd_logistics_offers_insert_dkd on public.dkd_logistics_offers;
create policy dkd_logistics_offers_insert_dkd on public.dkd_logistics_offers
  for insert to authenticated
  with check (
    transporter_user_id = auth.uid()
    and exists (
      select 1
      from public.dkd_profiles
      where dkd_profiles.user_id = auth.uid()
        and dkd_profiles.dkd_logistics_status = 'approved'
    )
  );

drop policy if exists dkd_logistics_offers_update_dkd on public.dkd_logistics_offers;
create policy dkd_logistics_offers_update_dkd on public.dkd_logistics_offers
  for update to authenticated
  using (transporter_user_id = auth.uid())
  with check (transporter_user_id = auth.uid());

drop policy if exists dkd_logistics_messages_select_dkd on public.dkd_logistics_messages;
create policy dkd_logistics_messages_select_dkd on public.dkd_logistics_messages
  for select to authenticated
  using (true);

drop policy if exists dkd_logistics_messages_insert_dkd on public.dkd_logistics_messages;
create policy dkd_logistics_messages_insert_dkd on public.dkd_logistics_messages
  for insert to authenticated
  with check (dkd_sender_user_id = auth.uid());

grant select, insert, update on public.dkd_logistics_applications to authenticated;
grant select, insert, update on public.dkd_logistics_jobs to authenticated;
grant select, insert, update on public.dkd_logistics_offers to authenticated;
grant select, insert on public.dkd_logistics_messages to authenticated;
grant usage, select on all sequences in schema public to authenticated;
