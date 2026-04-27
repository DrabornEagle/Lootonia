begin;

-- DKD phase 27
-- 1) Takviye paketleri web timeline / order history tarafını text-safe hale getirir.
-- 2) Hatalı dkd_business_members referansını gerçek tablo olan dkd_business_memberships ile değiştirir.
-- 3) dkd_business_profiles bigint bağımlılığını kaldırır; business_id text olarak tutulur.

-- previous objects

drop trigger if exists dkd_write_business_order_status_history on public.dkd_business_product_orders;
drop function if exists public.dkd_write_business_order_status_history();
drop function if exists public.dkd_business_order_status_title(text);
drop function if exists public.dkd_business_order_status_note(text, text);
drop function if exists public.dkd_map_courier_job_status_to_business_order_status(text, text);
drop function if exists public.dkd_sync_business_order_status_from_courier_job();
drop table if exists public.dkd_business_order_status_history;

create table public.dkd_business_order_status_history (
  id bigserial primary key,
  order_id text not null,
  business_id text,
  actor_user_id uuid,
  status_key text not null,
  title_text text not null,
  note_text text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists dkd_business_order_status_history_order_created_idx
  on public.dkd_business_order_status_history(order_id, created_at asc);

alter table public.dkd_business_order_status_history enable row level security;

drop policy if exists dkd_business_order_status_history_select_readers on public.dkd_business_order_status_history;
create policy dkd_business_order_status_history_select_readers
  on public.dkd_business_order_status_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.dkd_business_product_orders as dkd_order_table
      where dkd_order_table.id::text = public.dkd_business_order_status_history.order_id
        and (
          dkd_order_table.buyer_user_id = auth.uid()
          or exists (
            select 1
            from public.dkd_business_memberships as dkd_membership_table
            where dkd_membership_table.business_id::text = dkd_order_table.business_id::text
              and dkd_membership_table.user_id = auth.uid()
              and coalesce(dkd_membership_table.is_active, true) = true
          )
        )
    )
  );

grant select on public.dkd_business_order_status_history to authenticated;
grant usage, select on sequence public.dkd_business_order_status_history_id_seq to authenticated;

create or replace function public.dkd_business_order_status_title(
  dkd_param_status text
)
returns text
language sql
immutable
as $dkd_status_title$
  select case lower(coalesce(dkd_param_status, 'paid_token'))
    when 'paid' then 'Sipariş alındı'
    when 'paid_token' then 'Sipariş alındı'
    when 'assigned_courier' then 'Kurye atandı'
    when 'courier_assigned' then 'Kurye atandı'
    when 'picked_up' then 'Hazırlandı ve yola çıktı'
    when 'on_the_way' then 'Hazırlandı ve yola çıktı'
    when 'shipping' then 'Hazırlandı ve yola çıktı'
    when 'delivered' then 'Teslim edildi'
    when 'completed' then 'Teslim edildi'
    when 'cancelled' then 'Sipariş iptal edildi'
    when 'canceled' then 'Sipariş iptal edildi'
    when 'failed' then 'Sipariş iptal edildi'
    else 'Sipariş güncellendi'
  end
$dkd_status_title$;

create or replace function public.dkd_business_order_status_note(
  dkd_param_status text,
  dkd_param_delivery_address text default null
)
returns text
language sql
immutable
as $dkd_status_note$
  select case lower(coalesce(dkd_param_status, 'paid_token'))
    when 'paid' then coalesce(dkd_param_delivery_address, 'Ödeme onayı tamamlandı.')
    when 'paid_token' then coalesce(dkd_param_delivery_address, 'Ödeme onayı tamamlandı.')
    when 'assigned_courier' then 'Kurye görevi kabul etti.'
    when 'courier_assigned' then 'Kurye görevi kabul etti.'
    when 'picked_up' then 'Sipariş işletmeden teslim alındı ve teslimata çıktı.'
    when 'on_the_way' then 'Sipariş teslimat adresine doğru yolda.'
    when 'shipping' then 'Sipariş teslimat adresine doğru yolda.'
    when 'delivered' then 'Sipariş başarıyla teslim edildi.'
    when 'completed' then 'Sipariş başarıyla teslim edildi.'
    when 'cancelled' then 'Sipariş iptal edildi.'
    when 'canceled' then 'Sipariş iptal edildi.'
    when 'failed' then 'Sipariş iptal edildi.'
    else null
  end
$dkd_status_note$;

insert into public.dkd_business_order_status_history (
  order_id,
  business_id,
  actor_user_id,
  status_key,
  title_text,
  note_text,
  created_at
)
select
  dkd_order_table.id::text,
  dkd_order_table.business_id::text,
  dkd_order_table.buyer_user_id,
  'paid_token' as status_key,
  public.dkd_business_order_status_title('paid_token') as title_text,
  coalesce(dkd_order_table.delivery_address, 'İlk sipariş kaydı oluşturuldu.') as note_text,
  coalesce(dkd_order_table.created_at, timezone('utc', now())) as created_at
from public.dkd_business_product_orders as dkd_order_table;

insert into public.dkd_business_order_status_history (
  order_id,
  business_id,
  actor_user_id,
  status_key,
  title_text,
  note_text,
  created_at
)
select
  dkd_order_table.id::text,
  dkd_order_table.business_id::text,
  dkd_order_table.buyer_user_id,
  coalesce(dkd_order_table.status, 'paid_token') as status_key,
  public.dkd_business_order_status_title(dkd_order_table.status) as title_text,
  public.dkd_business_order_status_note(dkd_order_table.status, dkd_order_table.delivery_address) as note_text,
  coalesce(dkd_order_table.updated_at, dkd_order_table.created_at, timezone('utc', now())) as created_at
from public.dkd_business_product_orders as dkd_order_table
where lower(coalesce(dkd_order_table.status, 'paid_token')) not in ('paid', 'paid_token');

create or replace function public.dkd_write_business_order_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $dkd_history_trigger$
begin
  if tg_op = 'INSERT' then
    insert into public.dkd_business_order_status_history (
      order_id,
      business_id,
      actor_user_id,
      status_key,
      title_text,
      note_text,
      created_at
    ) values (
      new.id::text,
      new.business_id::text,
      coalesce(new.buyer_user_id, auth.uid()),
      coalesce(new.status, 'paid_token'),
      public.dkd_business_order_status_title(new.status),
      public.dkd_business_order_status_note(new.status, new.delivery_address),
      coalesce(new.created_at, timezone('utc', now()))
    );
    return new;
  end if;

  if coalesce(old.status, '') is distinct from coalesce(new.status, '') then
    insert into public.dkd_business_order_status_history (
      order_id,
      business_id,
      actor_user_id,
      status_key,
      title_text,
      note_text,
      created_at
    ) values (
      new.id::text,
      new.business_id::text,
      coalesce(auth.uid(), new.buyer_user_id),
      coalesce(new.status, 'paid_token'),
      public.dkd_business_order_status_title(new.status),
      public.dkd_business_order_status_note(new.status, new.delivery_address),
      timezone('utc', now())
    );
  end if;

  return new;
end;
$dkd_history_trigger$;

create trigger dkd_write_business_order_status_history
after insert or update of status on public.dkd_business_product_orders
for each row
execute function public.dkd_write_business_order_status_history();

create or replace function public.dkd_map_courier_job_status_to_business_order_status(
  dkd_param_status text,
  dkd_param_pickup_status text default null
)
returns text
language sql
immutable
as $dkd_courier_map$
  select case
    when lower(coalesce(dkd_param_pickup_status, '')) = 'delivered' then 'delivered'
    when lower(coalesce(dkd_param_status, '')) = 'accepted' then 'assigned_courier'
    when lower(coalesce(dkd_param_status, '')) = 'picked_up' then 'picked_up'
    when lower(coalesce(dkd_param_status, '')) in ('completed', 'delivered') then 'delivered'
    else null
  end
$dkd_courier_map$;

create or replace function public.dkd_sync_business_order_status_from_courier_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $dkd_courier_sync_trigger$
declare
  dkd_target_status_value text;
begin
  if new.order_id is null then
    return new;
  end if;

  dkd_target_status_value := public.dkd_map_courier_job_status_to_business_order_status(new.status, new.pickup_status);
  if dkd_target_status_value is null then
    return new;
  end if;

  update public.dkd_business_product_orders
  set status = dkd_target_status_value,
      updated_at = timezone('utc', now())
  where id::text = new.order_id::text
    and coalesce(status, '') is distinct from dkd_target_status_value;

  return new;
end;
$dkd_courier_sync_trigger$;

do $dkd_courier_block$
begin
  if to_regclass('public.dkd_courier_jobs') is null then
    return;
  end if;

  execute 'drop trigger if exists dkd_sync_business_order_status_from_courier_job on public.dkd_courier_jobs';

  execute 'create trigger dkd_sync_business_order_status_from_courier_job after insert or update of status, pickup_status on public.dkd_courier_jobs for each row execute function public.dkd_sync_business_order_status_from_courier_job()';

  with dkd_courier_order_state_values as (
    select distinct on (dkd_courier_job_table.order_id::text)
      dkd_courier_job_table.order_id::text as dkd_order_key_value,
      public.dkd_map_courier_job_status_to_business_order_status(dkd_courier_job_table.status, dkd_courier_job_table.pickup_status) as dkd_target_status_value
    from public.dkd_courier_jobs as dkd_courier_job_table
    where dkd_courier_job_table.order_id is not null
      and public.dkd_map_courier_job_status_to_business_order_status(dkd_courier_job_table.status, dkd_courier_job_table.pickup_status) is not null
    order by dkd_courier_job_table.order_id::text,
             coalesce(dkd_courier_job_table.updated_at, dkd_courier_job_table.created_at) desc,
             dkd_courier_job_table.id desc
  )
  update public.dkd_business_product_orders as dkd_order_table
  set status = dkd_courier_order_state_values.dkd_target_status_value,
      updated_at = timezone('utc', now())
  from dkd_courier_order_state_values
  where dkd_order_table.id::text = dkd_courier_order_state_values.dkd_order_key_value
    and coalesce(dkd_order_table.status, '') is distinct from dkd_courier_order_state_values.dkd_target_status_value;
end;
$dkd_courier_block$;

commit;
