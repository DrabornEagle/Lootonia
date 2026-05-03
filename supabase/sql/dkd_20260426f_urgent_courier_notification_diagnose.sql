-- DKD Lootonia Acil Kurye bildirim teşhis SQL'i
-- Amaç: Acil Kurye siparişinin hangi tabloda oluştuğunu ve Edge Function'a düşüp düşmediğini ayırmak.

-- 1) Acil/urgent/kargo/kurye benzeri tabloları bul.
select
  table_schema as dkd_table_schema,
  table_name as dkd_table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and (
    table_name ilike '%urgent%'
    or table_name ilike '%acil%'
    or table_name ilike '%courier%'
    or table_name ilike '%kurye%'
    or table_name ilike '%cargo%'
    or table_name ilike '%kargo%'
  )
order by table_name;

-- 2) Bu tabloların kolonlarını gör. Özellikle id/status/job_type/order_type/type/created_at var mı kontrol et.
select
  table_name as dkd_table_name,
  column_name as dkd_column_name,
  data_type as dkd_data_type
from information_schema.columns
where table_schema = 'public'
  and (
    table_name ilike '%urgent%'
    or table_name ilike '%acil%'
    or table_name ilike '%courier%'
    or table_name ilike '%kurye%'
    or table_name ilike '%cargo%'
    or table_name ilike '%kargo%'
  )
order by table_name, ordinal_position;

-- 3) Eğer Acil Kurye dkd_courier_jobs içine düşüyorsa son kayıtları gösterir.
-- Bu sorguda yeni acil siparişin job_type/status/id değerini kontrol et.
select
  id as dkd_id,
  job_type as dkd_job_type,
  status as dkd_status,
  is_active as dkd_is_active,
  assigned_user_id as dkd_assigned_user_id,
  title as dkd_title,
  merchant_name as dkd_merchant_name,
  product_title as dkd_product_title,
  pickup as dkd_pickup,
  dropoff as dkd_dropoff,
  created_at as dkd_created_at
from public.dkd_courier_jobs
where created_at > timezone('utc', now()) - interval '2 hours'
order by created_at desc
limit 30;

-- 4) Son bildirim audit kayıtları: Acil Kurye için satır hiç oluşmuyorsa Edge Function tetiklenmiyor demektir.
select
  id as dkd_audit_id,
  job_id as dkd_job_id,
  job_status as dkd_job_status,
  job_type as dkd_job_type,
  dkd_push_segment,
  send_status as dkd_send_status,
  send_error as dkd_send_error,
  sent_at as dkd_sent_at,
  created_at as dkd_created_at
from public.dkd_courier_push_audit
order by created_at desc
limit 40;
