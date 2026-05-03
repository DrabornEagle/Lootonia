begin;

alter table public.dkd_support_threads
  add column if not exists dkd_ai_status_key text not null default 'dkd_ai_pending',
  add column if not exists dkd_ai_last_issue_text text,
  add column if not exists dkd_ai_answered_at timestamptz,
  add column if not exists dkd_admin_needed boolean not null default false;

create index if not exists dkd_support_threads_ticket_code_idx
  on public.dkd_support_threads(dkd_ticket_code);

create index if not exists dkd_support_threads_admin_needed_idx
  on public.dkd_support_threads(dkd_admin_needed, dkd_updated_at desc);

create index if not exists dkd_support_messages_message_thread_idx
  on public.dkd_support_messages(dkd_id, dkd_thread_id);

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
  dkd_keywords text[] not null default array[]::text[],
  dkd_sort_order integer not null default 100,
  dkd_is_active boolean not null default true,
  dkd_created_at timestamptz not null default timezone('utc', now()),
  dkd_updated_at timestamptz not null default timezone('utc', now())
);

alter table public.dkd_support_ai_daily_usage enable row level security;
alter table public.dkd_support_ai_knowledge_base enable row level security;

drop policy if exists dkd_support_ai_daily_usage_admin_all on public.dkd_support_ai_daily_usage;
create policy dkd_support_ai_daily_usage_admin_all
  on public.dkd_support_ai_daily_usage
  for all
  to authenticated
  using (public.dkd_is_admin())
  with check (public.dkd_is_admin());

drop policy if exists dkd_support_ai_knowledge_base_admin_all on public.dkd_support_ai_knowledge_base;
create policy dkd_support_ai_knowledge_base_admin_all
  on public.dkd_support_ai_knowledge_base
  for all
  to authenticated
  using (public.dkd_is_admin())
  with check (public.dkd_is_admin());

grant select, insert, update, delete on public.dkd_support_ai_daily_usage to authenticated;
grant select, insert, update, delete on public.dkd_support_ai_knowledge_base to authenticated;

delete from public.dkd_support_ai_daily_usage
where dkd_provider_key = 'dkd_gemini'
  and dkd_usage_date = (timezone('utc', now()))::date;

delete from public.dkd_support_ai_knowledge_base
where dkd_title in (
  'DKD Gemini Thread Lookup Kurye Kargo',
  'DKD Gemini Thread Lookup Market',
  'DKD Gemini Thread Lookup Hesap Bakiye',
  'DKD Gemini Thread Lookup Teknik Hata',
  'DKD Gemini Thread Lookup Selamlama'
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
  'DKD Gemini Thread Lookup Kurye Kargo',
  'Kurye, kargo, canlı takip, rota, gönderilerim, teslimat, kargom nerede soruları.',
  'Kurye/Kargo talebini aldık. Uygulamayı kapatıp tekrar aç, konum iznini kontrol et ve Kurye-Kargo > Gönderilerim > CANLI TAKİP alanını yeniden dene. Rota veya gönderi görünmüyorsa sipariş kodunu aynı konuşmaya yaz.',
  array['kurye','kargo','canlı takip','rota','kargom nerede','gönderilerim'],
  10,
  true
),
(
  'dkd_market_order',
  'DKD Gemini Thread Lookup Market',
  'Market siparişi, ürün görünmüyor, işletme ürünü ve sipariş geçmişi soruları.',
  'Market siparişiyle ilgili talebini aldık. Aynı hesapla giriş yaptığını kontrol edip Market > Siparişlerim alanını yenile. Ürün veya sipariş görünmüyorsa ürün adını, yaklaşık saati ve sipariş kodunu yaz.',
  array['market','sipariş','ürün','işletme ürünü','sipariş geçmişi'],
  20,
  true
),
(
  'dkd_account_wallet',
  'DKD Gemini Thread Lookup Hesap Bakiye',
  'Hesap, profil, giriş ve bakiye görünmüyor soruları.',
  'Hesap/Bakiye talebini aldık. Çıkış yapıp aynı e-posta ile tekrar giriş yapmayı dene ve Profil/Bakiye alanını yenile. Tutar farklı görünüyorsa beklediğin tutarı ve işlem saatini yaz.',
  array['hesap','bakiye','profil','giriş','ödeme'],
  30,
  true
),
(
  'dkd_technical_problem',
  'DKD Gemini Thread Lookup Teknik Hata',
  'Teknik hata, açılmıyor, buton çalışmıyor, yavaşlık ve beyaz ekran soruları.',
  'Teknik hata talebini aldık. Uygulamayı tamamen kapatıp tekrar aç, internet bağlantını kontrol et ve aynı ekranı yeniden dene. Sorun devam ederse ekran adını, bastığın butonu ve hata yazısını yaz.',
  array['hata','açılmıyor','buton','yavaş','beyaz ekran','göremiyorum'],
  40,
  true
),
(
  'dkd_general',
  'DKD Gemini Thread Lookup Selamlama',
  'Selam, merhaba, nasılsınız gibi genel destek başlangıç mesajları.',
  'Merhaba, buradayız. Yaşadığın sorunu tek cümleyle yazarsan hemen kontrol edelim. Sipariş kodu, ekran adı veya hata yazısı varsa aynı konuşmaya ekleyebilirsin.',
  array['selam','merhaba','naber','nasılsınız'],
  50,
  true
);

commit;
