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

alter table public.dkd_support_ai_daily_usage enable row level security;
alter table public.dkd_support_ai_knowledge_base enable row level security;

grant select, insert, update on public.dkd_support_ai_daily_usage to authenticated;
grant select, insert, update, delete on public.dkd_support_ai_knowledge_base to authenticated;

create index if not exists dkd_support_ai_knowledge_topic_idx
  on public.dkd_support_ai_knowledge_base(dkd_topic_key, dkd_is_active, dkd_sort_order);

create index if not exists dkd_support_threads_ai_status_idx
  on public.dkd_support_threads(dkd_ai_status_key, dkd_admin_needed, dkd_updated_at desc);

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
  dkd_var_issue_text text := nullif(left(trim(coalesce(dkd_param_issue_text, '')), 360), '');
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
    dkd_ai_last_issue_text = case
      when dkd_var_ai_status_key = 'dkd_ai_answered' then null
      else dkd_var_issue_text
    end,
    dkd_ai_answered_at = case
      when dkd_var_ai_status_key = 'dkd_ai_answered' then timezone('utc', now())
      else dkd_ai_answered_at
    end,
    dkd_admin_needed = coalesce(dkd_param_admin_needed, false),
    dkd_status_key = case
      when dkd_var_ai_status_key = 'dkd_ai_answered' then 'dkd_answered'
      else dkd_status_key
    end,
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
    dkd_estimated_input_chars = dkd_estimated_input_chars + greatest(coalesce(dkd_param_estimated_input_chars, 0), 0),
    dkd_updated_at = timezone('utc', now())
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

-- Testler sırasında dolan yapay günlük sayaç sıfırlanır.
delete from public.dkd_support_ai_daily_usage
where dkd_provider_key = 'dkd_gemini'
  and dkd_usage_date = (timezone('utc', now()))::date;

-- Bu paketin bilgi tabanı satırları tekrar kurulurken eski kopyaları temizlenir.
delete from public.dkd_support_ai_knowledge_base
where dkd_title in (
  'DKD Gemini Kurye/Kargo otomatik cevap',
  'DKD Gemini Market otomatik cevap',
  'DKD Gemini Hesap/Bakiye otomatik cevap',
  'DKD Gemini Teknik Hata otomatik cevap',
  'DKD Gemini Genel selamlama otomatik cevap',
  'DKD Gemini Özel işlem admin kontrolü'
);

insert into public.dkd_support_ai_knowledge_base (
  dkd_topic_key,
  dkd_title,
  dkd_question_text,
  dkd_answer_text,
  dkd_keywords,
  dkd_sort_order,
  dkd_is_active
) values
(
  'dkd_courier_cargo',
  'DKD Gemini Kurye/Kargo otomatik cevap',
  'Kurye, kargo, canlı takip, rota, gönderilerim, teslimat, acil kurye sorunları için otomatik ilk cevap.',
  'Kurye/Kargo talebini aldık. Önce uygulamayı tamamen kapatıp tekrar aç, konum izninin açık olduğundan emin ol ve Kurye-Kargo > Gönderilerim > CANLI TAKİP alanını yeniden dene. Rota hâlâ görünmüyorsa sipariş kodunu aynı konuşmaya yaz; ekip gönderi kaydını kontrol edecek.',
  array['kurye','kargo','canlı takip','rota','harita','teslimat','gönderilerim','acil kurye'],
  5,
  true
),
(
  'dkd_market_order',
  'DKD Gemini Market otomatik cevap',
  'Market siparişi, işletme ürünü, ürün görünmüyor, sipariş geçmişi ve teslimat soruları için otomatik ilk cevap.',
  'Market siparişiyle ilgili talebini aldık. Aynı hesapla giriş yaptığını kontrol edip Market > Siparişlerim alanını yenile. Sipariş veya ürün hâlâ görünmüyorsa ürün adını, yaklaşık saati ve varsa sipariş kodunu bu konuşmaya yaz.',
  array['market','sipariş','işletme','ürün','teslimat','sipariş geçmişi'],
  10,
  true
),
(
  'dkd_account_wallet',
  'DKD Gemini Hesap/Bakiye otomatik cevap',
  'Hesap, bakiye, profil, giriş, ödeme görünümü ve hesap erişimi soruları için otomatik ilk cevap.',
  'Hesap/Bakiye talebini aldık. Çıkış yapıp aynı e-posta ile tekrar giriş yapmayı dene ve Profil/Bakiye alanını yenile. Bakiye hâlâ farklı görünüyorsa beklediğin tutarı, ekran adını ve işlem saatini aynı konuşmaya yaz.',
  array['hesap','bakiye','profil','giriş','ödeme','cüzdan'],
  15,
  true
),
(
  'dkd_technical_problem',
  'DKD Gemini Teknik Hata otomatik cevap',
  'Teknik hata, açılmıyor, göremiyorum, yavaş çalışıyor, buton çalışmıyor, ekran yüklenmiyor soruları için otomatik ilk cevap.',
  'Teknik hata talebini aldık. Uygulamayı tamamen kapatıp tekrar aç, internet bağlantını kontrol et ve aynı ekranı yeniden dene. Sorun devam ederse ekran adını, bastığın butonu ve gördüğün hata yazısını bu konuşmaya yaz; admin ekip kaydı kontrol edecek.',
  array['teknik','hata','açılmıyor','göremiyorum','yavaş','buton','ekran','donma'],
  20,
  true
),
(
  'dkd_general',
  'DKD Gemini Genel selamlama otomatik cevap',
  'Selam, merhaba, nasılsınız ve genel destek başlangıç mesajları için otomatik cevap.',
  'Merhaba, buradayız. Yaşadığın sorunu tek cümleyle yazarsan hemen kontrol edelim. Sipariş kodu, ekran adı veya hata yazısı varsa aynı konuşmaya ekleyebilirsin.',
  array['selam','merhaba','nasılsınız','genel','destek'],
  25,
  true
),
(
  'dkd_general',
  'DKD Gemini Özel işlem admin kontrolü',
  'İade, ödeme, hesap silme, bakiye yükleme, kişisel veri ve gerçek kayıt kontrolü gerektiren işlemler için admin yönlendirmesi.',
  'Talebini aldık. Bu işlem hesap, ödeme veya gerçek sipariş kaydı kontrolü gerektirdiği için admin ekibi aynı destek konuşmasından güvenli şekilde yanıt verecek. Sipariş kodu veya işlem saati varsa buraya yazabilirsin.',
  array['iade','ödeme','hesap sil','bakiye yükle','kişisel veri','sipariş iptal'],
  30,
  true
);

commit;
