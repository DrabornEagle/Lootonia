begin;

create table if not exists public.dkd_market_support_messages (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_text text not null,
  message_text text not null,
  order_number text,
  email_address text,
  phone_text text,
  attachment_name text,
  delivery_status text not null default 'queued',
  delivery_channel text not null default 'supabase',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists dkd_market_support_messages_user_created_idx
  on public.dkd_market_support_messages(user_id, created_at desc);

alter table public.dkd_market_support_messages enable row level security;

drop policy if exists dkd_market_support_messages_select_own on public.dkd_market_support_messages;
create policy dkd_market_support_messages_select_own
  on public.dkd_market_support_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists dkd_market_support_messages_insert_own on public.dkd_market_support_messages;
create policy dkd_market_support_messages_insert_own
  on public.dkd_market_support_messages
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists dkd_market_support_messages_update_own on public.dkd_market_support_messages;
create policy dkd_market_support_messages_update_own
  on public.dkd_market_support_messages
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.dkd_market_support_messages to authenticated;
grant usage, select on sequence public.dkd_market_support_messages_id_seq to authenticated;

create table if not exists public.dkd_business_order_status_history (
  id bigserial primary key,
  order_id bigint not null references public.dkd_business_product_orders(id) on delete cascade,
  business_id bigint not null references public.dkd_business_profiles(id) on delete cascade,
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
      from public.dkd_business_product_orders as dkd_order
      where dkd_order.id = dkd_business_order_status_history.order_id
        and (
          dkd_order.buyer_user_id = auth.uid()
          or exists (
            select 1
            from public.dkd_business_members as dkd_member
            where dkd_member.business_id = dkd_order.business_id
              and dkd_member.user_id = auth.uid()
          )
        )
    )
  );

grant select on public.dkd_business_order_status_history to authenticated;
grant usage, select on sequence public.dkd_business_order_status_history_id_seq to authenticated;

create or replace function public.dkd_touch_market_support_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists dkd_touch_market_support_messages_updated_at on public.dkd_market_support_messages;
create trigger dkd_touch_market_support_messages_updated_at
before update on public.dkd_market_support_messages
for each row
execute function public.dkd_touch_market_support_messages_updated_at();

create or replace function public.dkd_write_business_order_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_status_title_value text;
  dkd_status_note_value text;
begin
  dkd_status_title_value := case lower(coalesce(new.status, 'paid_token'))
    when 'paid' then 'Sipariş alındı'
    when 'paid_token' then 'Sipariş alındı'
    when 'assigned_courier' then 'Kurye atandı'
    when 'courier_assigned' then 'Kurye atandı'
    when 'picked_up' then 'İşletmeden alındı'
    when 'on_the_way' then 'Yola çıktı'
    when 'shipping' then 'Yola çıktı'
    when 'delivered' then 'Teslim edildi'
    when 'completed' then 'Teslim edildi'
    when 'cancelled' then 'Sipariş iptal edildi'
    when 'canceled' then 'Sipariş iptal edildi'
    when 'failed' then 'Sipariş iptal edildi'
    else 'Sipariş güncellendi'
  end;

  dkd_status_note_value := case lower(coalesce(new.status, 'paid_token'))
    when 'paid' then coalesce(new.delivery_address, 'Ödeme onayı tamamlandı.')
    when 'paid_token' then coalesce(new.delivery_address, 'Ödeme onayı tamamlandı.')
    when 'assigned_courier' then 'Kurye ataması yapıldı.'
    when 'courier_assigned' then 'Kurye ataması yapıldı.'
    when 'picked_up' then 'Sipariş işletmeden teslim alındı.'
    when 'on_the_way' then 'Sipariş teslimat adresine doğru yola çıktı.'
    when 'shipping' then 'Sipariş teslimat adresine doğru yola çıktı.'
    when 'delivered' then 'Sipariş başarıyla teslim edildi.'
    when 'completed' then 'Sipariş başarıyla teslim edildi.'
    when 'cancelled' then 'Sipariş iptal edildi.'
    when 'canceled' then 'Sipariş iptal edildi.'
    when 'failed' then 'Sipariş iptal edildi.'
    else null
  end;

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
      new.id,
      new.business_id,
      new.buyer_user_id,
      coalesce(new.status, 'paid_token'),
      dkd_status_title_value,
      dkd_status_note_value,
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
      new.id,
      new.business_id,
      auth.uid(),
      coalesce(new.status, 'paid_token'),
      dkd_status_title_value,
      dkd_status_note_value,
      timezone('utc', now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists dkd_write_business_order_status_history on public.dkd_business_product_orders;
create trigger dkd_write_business_order_status_history
after insert or update of status on public.dkd_business_product_orders
for each row
execute function public.dkd_write_business_order_status_history();

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
  dkd_order.id,
  dkd_order.business_id,
  dkd_order.buyer_user_id,
  coalesce(dkd_order.status, 'paid_token') as status_key,
  case lower(coalesce(dkd_order.status, 'paid_token'))
    when 'paid' then 'Sipariş alındı'
    when 'paid_token' then 'Sipariş alındı'
    when 'assigned_courier' then 'Kurye atandı'
    when 'courier_assigned' then 'Kurye atandı'
    when 'picked_up' then 'İşletmeden alındı'
    when 'on_the_way' then 'Yola çıktı'
    when 'shipping' then 'Yola çıktı'
    when 'delivered' then 'Teslim edildi'
    when 'completed' then 'Teslim edildi'
    when 'cancelled' then 'Sipariş iptal edildi'
    when 'canceled' then 'Sipariş iptal edildi'
    when 'failed' then 'Sipariş iptal edildi'
    else 'Sipariş güncellendi'
  end as title_text,
  coalesce(dkd_order.delivery_address, 'İlk sipariş kaydı oluşturuldu.') as note_text,
  coalesce(dkd_order.created_at, timezone('utc', now())) as created_at
from public.dkd_business_product_orders as dkd_order
where not exists (
  select 1
  from public.dkd_business_order_status_history as dkd_history
  where dkd_history.order_id = dkd_order.id
);

commit;
