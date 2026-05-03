begin;

alter table public.dkd_support_threads
  add column if not exists dkd_ai_status_key text not null default 'dkd_ai_pending',
  add column if not exists dkd_ai_last_issue_text text,
  add column if not exists dkd_ai_answered_at timestamptz,
  add column if not exists dkd_admin_needed boolean not null default false;

create table if not exists public.dkd_support_ai_daily_usage (
  dkd_usage_date date not null,
  dkd_provider_key text not null default 'dkd_gemini',
  dkd_model_key text not null default 'gemini-2.5-flash-lite',
  dkd_request_count integer not null default 0,
  dkd_estimated_input_chars integer not null default 0,
  dkd_estimated_output_chars integer not null default 0,
  dkd_created_at timestamptz not null default timezone('utc', now()),
  dkd_updated_at timestamptz not null default timezone('utc', now()),
  primary key (dkd_usage_date, dkd_provider_key, dkd_model_key)
);

create table if not exists public.dkd_support_ai_knowledge_base (
  dkd_id uuid primary key default gen_random_uuid(),
  dkd_topic_key text not null default 'dkd_general',
  dkd_title text not null,
  dkd_question_text text not null,
  dkd_answer_text text not null,
  dkd_keywords text[] not null default '{}',
  dkd_sort_order integer not null default 100,
  dkd_is_active boolean not null default true,
  dkd_created_at timestamptz not null default timezone('utc', now()),
  dkd_updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists dkd_support_ai_knowledge_topic_idx
  on public.dkd_support_ai_knowledge_base(dkd_topic_key, dkd_is_active, dkd_sort_order);

create index if not exists dkd_support_threads_ai_status_idx
  on public.dkd_support_threads(dkd_ai_status_key, dkd_admin_needed, dkd_updated_at desc);

alter table public.dkd_support_ai_daily_usage enable row level security;
alter table public.dkd_support_ai_knowledge_base enable row level security;

drop policy if exists dkd_support_ai_daily_usage_select_admin on public.dkd_support_ai_daily_usage;
create policy dkd_support_ai_daily_usage_select_admin
  on public.dkd_support_ai_daily_usage
  for select
  to authenticated
  using (public.dkd_is_admin());

drop policy if exists dkd_support_ai_daily_usage_write_admin on public.dkd_support_ai_daily_usage;
create policy dkd_support_ai_daily_usage_write_admin
  on public.dkd_support_ai_daily_usage
  for all
  to authenticated
  using (public.dkd_is_admin())
  with check (public.dkd_is_admin());

drop policy if exists dkd_support_ai_knowledge_select_admin on public.dkd_support_ai_knowledge_base;
create policy dkd_support_ai_knowledge_select_admin
  on public.dkd_support_ai_knowledge_base
  for select
  to authenticated
  using (public.dkd_is_admin());

drop policy if exists dkd_support_ai_knowledge_write_admin on public.dkd_support_ai_knowledge_base;
create policy dkd_support_ai_knowledge_write_admin
  on public.dkd_support_ai_knowledge_base
  for all
  to authenticated
  using (public.dkd_is_admin())
  with check (public.dkd_is_admin());

grant select, insert, update on public.dkd_support_ai_daily_usage to authenticated;
grant select, insert, update, delete on public.dkd_support_ai_knowledge_base to authenticated;

create or replace function public.dkd_touch_support_ai_daily_usage_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.dkd_updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists dkd_touch_support_ai_daily_usage_updated_at on public.dkd_support_ai_daily_usage;
create trigger dkd_touch_support_ai_daily_usage_updated_at
before update on public.dkd_support_ai_daily_usage
for each row
execute function public.dkd_touch_support_ai_daily_usage_updated_at();

create or replace function public.dkd_touch_support_ai_knowledge_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.dkd_updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists dkd_touch_support_ai_knowledge_updated_at on public.dkd_support_ai_knowledge_base;
create trigger dkd_touch_support_ai_knowledge_updated_at
before update on public.dkd_support_ai_knowledge_base
for each row
execute function public.dkd_touch_support_ai_knowledge_updated_at();

create or replace function public.dkd_claim_support_ai_daily_slot(
  dkd_param_model_key text default 'gemini-2.5-flash-lite',
  dkd_param_daily_limit integer default 45,
  dkd_param_estimated_input_chars integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_usage_date date := (timezone('utc', now()))::date;
  dkd_var_model_key text := left(coalesce(nullif(trim(dkd_param_model_key), ''), 'gemini-2.5-flash-lite'), 120);
  dkd_var_daily_limit integer := greatest(coalesce(dkd_param_daily_limit, 45), 0);
  dkd_var_next_count integer;
begin
  insert into public.dkd_support_ai_daily_usage (
    dkd_usage_date,
    dkd_provider_key,
    dkd_model_key,
    dkd_request_count,
    dkd_estimated_input_chars
  ) values (
    dkd_var_usage_date,
    'dkd_gemini',
    dkd_var_model_key,
    0,
    0
  )
  on conflict (dkd_usage_date, dkd_provider_key, dkd_model_key) do nothing;

  update public.dkd_support_ai_daily_usage
  set
    dkd_request_count = dkd_request_count + 1,
    dkd_estimated_input_chars = dkd_estimated_input_chars + greatest(coalesce(dkd_param_estimated_input_chars, 0), 0)
  where dkd_usage_date = dkd_var_usage_date
    and dkd_provider_key = 'dkd_gemini'
    and dkd_model_key = dkd_var_model_key
    and dkd_request_count < dkd_var_daily_limit
  returning dkd_request_count into dkd_var_next_count;

  if dkd_var_next_count is null then
    select dkd_request_count
      into dkd_var_next_count
    from public.dkd_support_ai_daily_usage
    where dkd_usage_date = dkd_var_usage_date
      and dkd_provider_key = 'dkd_gemini'
      and dkd_model_key = dkd_var_model_key;

    return jsonb_build_object(
      'dkd_ok', false,
      'dkd_reason_key', 'dkd_daily_limit_reached',
      'dkd_usage_date', dkd_var_usage_date,
      'dkd_model_key', dkd_var_model_key,
      'dkd_request_count', coalesce(dkd_var_next_count, 0),
      'dkd_daily_limit', dkd_var_daily_limit
    );
  end if;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_usage_date', dkd_var_usage_date,
    'dkd_model_key', dkd_var_model_key,
    'dkd_request_count', dkd_var_next_count,
    'dkd_daily_limit', dkd_var_daily_limit
  );
end;
$$;

revoke all on function public.dkd_claim_support_ai_daily_slot(text, integer, integer) from public;
grant execute on function public.dkd_claim_support_ai_daily_slot(text, integer, integer) to authenticated;
grant execute on function public.dkd_claim_support_ai_daily_slot(text, integer, integer) to service_role;

create or replace function public.dkd_mark_support_thread_ai_status(
  dkd_param_thread_id uuid,
  dkd_param_ai_status_key text,
  dkd_param_admin_needed boolean default false,
  dkd_param_issue_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_ai_status_key text := left(coalesce(nullif(trim(dkd_param_ai_status_key), ''), 'dkd_ai_pending'), 80);
  dkd_var_status_title text;
begin
  if auth.role() <> 'service_role' and not coalesce(public.dkd_is_admin(), false) then
    raise exception 'dkd_admin_required';
  end if;

  dkd_var_status_title := case
    when dkd_var_ai_status_key = 'dkd_ai_answered' then 'Gemini yanıtladı'
    when dkd_var_ai_status_key = 'dkd_admin_needed' then 'Admin yanıtı bekliyor'
    when dkd_var_ai_status_key = 'dkd_ai_limit_reached' then 'Gemini limit doldu, admin bekliyor'
    when dkd_var_ai_status_key = 'dkd_ai_error' then 'Gemini hata verdi, admin bekliyor'
    else 'Destek kuyruğunda'
  end;

  update public.dkd_support_threads
  set
    dkd_ai_status_key = dkd_var_ai_status_key,
    dkd_ai_last_issue_text = nullif(left(trim(coalesce(dkd_param_issue_text, '')), 360), ''),
    dkd_ai_answered_at = case when dkd_var_ai_status_key = 'dkd_ai_answered' then timezone('utc', now()) else dkd_ai_answered_at end,
    dkd_admin_needed = coalesce(dkd_param_admin_needed, false),
    dkd_status_key = case when dkd_var_ai_status_key = 'dkd_ai_answered' then 'dkd_answered' else dkd_status_key end,
    dkd_status_title = dkd_var_status_title,
    dkd_updated_at = timezone('utc', now())
  where dkd_id = dkd_param_thread_id;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_thread_id', dkd_param_thread_id,
    'dkd_ai_status_key', dkd_var_ai_status_key,
    'dkd_admin_needed', coalesce(dkd_param_admin_needed, false),
    'dkd_status_title', dkd_var_status_title
  );
end;
$$;

revoke all on function public.dkd_mark_support_thread_ai_status(uuid, text, boolean, text) from public;
grant execute on function public.dkd_mark_support_thread_ai_status(uuid, text, boolean, text) to authenticated;
grant execute on function public.dkd_mark_support_thread_ai_status(uuid, text, boolean, text) to service_role;

insert into public.dkd_support_ai_knowledge_base (
  dkd_topic_key,
  dkd_title,
  dkd_question_text,
  dkd_answer_text,
  dkd_keywords,
  dkd_sort_order
) values
(
  'dkd_courier_cargo',
  'Kurye canlı takip açılmıyor',
  'Kurye/kargo canlı takip ekranı açılmıyor veya rota görünmüyor.',
  'Canlı takip için uygulama konum izni açık olmalı. Önce uygulamayı tamamen kapatıp yeniden açın, ardından Kurye-Kargo > Gönderilerim > CANLI TAKİP alanına girin. Harita yüklenmezse internet bağlantısını kontrol edin ve aynı destek konuşmasına sipariş kodunu yazın; admin ekip rota bilgisini elle kontrol eder.',
  array['kurye','kargo','canlı takip','rota','harita','gönderilerim'],
  10
),
(
  'dkd_courier_cargo',
  'Kurye mesajı veya durum güncellemesi gelmiyor',
  'Kurye/kargo akışında mesaj, bildirim veya durum güncellemesi gelmiyor.',
  'Bildirimler için telefon ayarlarında Lootonia bildirim izninin açık olduğundan emin olun. Uygulama içinde Kurye-Kargo ekranını yenileyin. Sipariş hâlâ güncellenmiyorsa destek konuşmasına sipariş kodunu ve son görünen durumu yazın; admin ekip gönderi geçmişini kontrol eder.',
  array['bildirim','mesaj','durum','otomatik mesaj','kurye','kargo'],
  20
),
(
  'dkd_market_order',
  'Market sipariş durumu',
  'Market siparişi, işletme ürünü veya sipariş geçmişi görünmüyor.',
  'Market siparişleri aynı hesap üzerinden profil, bakiye ve işletme sipariş geçmişiyle eşleşir. Önce aynı hesapla giriş yaptığınızı kontrol edin, sonra Market > Siparişlerim alanını yenileyin. Sipariş görünmüyorsa destek konuşmasına ürün adını, yaklaşık sipariş saatini ve varsa sipariş kodunu yazın.',
  array['market','sipariş','işletme','ürün','sipariş geçmişi'],
  30
),
(
  'dkd_account_wallet',
  'Bakiye ve hesap kontrolü',
  'Bakiye, profil veya hesap erişimi sorunu.',
  'Bakiye ve profil bilgisi aynı Supabase hesabından okunur. Çıkış yapıp tekrar aynı e-posta ile giriş yapın. Bakiye hâlâ farklı görünüyorsa destek konuşmasına ekran adını ve beklediğiniz bakiye bilgisini yazın; admin ekip hesap hareketlerini kontrol eder.',
  array['bakiye','profil','hesap','giriş','cüzdan'],
  40
),
(
  'dkd_technical_problem',
  'Uygulama yavaş veya buton tepki vermiyor',
  'Uygulama yavaş çalışıyor, ekran geç açılıyor veya buton çalışmıyor.',
  'Telefonu yeniden başlatmadan önce uygulamayı son uygulamalardan tamamen kapatıp tekrar açın. İnternet zayıfsa bazı ekranlar geç tepki verebilir. Sorun tek bir ekranda devam ediyorsa destek konuşmasına ekran adını, bastığınız butonu ve gördüğünüz hata yazısını yazın.',
  array['yavaş','hata','buton','beyaz ekran','donma','performans'],
  50
),
(
  'dkd_general',
  'Genel destek yönlendirme',
  'Bilgi tabanında net cevap bulunamayan genel destek talebi.',
  'Talebini aldık. Bu konu için admin ekibinin kontrolü gerekebilir. Sipariş kodu, ekran adı, hata mesajı veya ekran görüntüsü varsa aynı konuşmaya ek bilgi olarak yazın; admin ekip buradan yanıt verecek.',
  array['genel','destek','admin'],
  999
)
on conflict do nothing;

commit;
