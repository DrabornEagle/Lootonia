-- DKD Lootonia v0.47
-- draborneagle@gmail.com kullanıcısına Nakliye Başvuru onayı verir.
-- ÖNEMLİ: Bu dosya otomatik çalıştırılmadı. Supabase SQL Editor içinde admin/service role yetkisiyle çalıştırılmalıdır.

DO $$
DECLARE
  dkd_user_id_value uuid;
BEGIN
  SELECT dkd_auth_users.id
    INTO dkd_user_id_value
    FROM auth.users AS dkd_auth_users
   WHERE lower(dkd_auth_users.email) = lower('draborneagle@gmail.com')
   ORDER BY dkd_auth_users.created_at DESC
   LIMIT 1;

  IF dkd_user_id_value IS NULL THEN
    RAISE EXCEPTION 'dkd_user_not_found: draborneagle@gmail.com';
  END IF;

  INSERT INTO public.dkd_profiles (
    user_id,
    dkd_logistics_status,
    dkd_logistics_profile_meta
  )
  VALUES (
    dkd_user_id_value,
    'approved',
    jsonb_build_object(
      'dkd_approved_by_sql', true,
      'dkd_approved_at', now(),
      'dkd_source', 'dkd_20260502_approve_logistics_draborneagle_v0_47'
    )
  )
  ON CONFLICT (user_id) DO UPDATE
    SET dkd_logistics_status = 'approved',
        dkd_logistics_profile_meta = coalesce(public.dkd_profiles.dkd_logistics_profile_meta, '{}'::jsonb)
          || jsonb_build_object(
            'dkd_approved_by_sql', true,
            'dkd_approved_at', now(),
            'dkd_source', 'dkd_20260502_approve_logistics_draborneagle_v0_47'
          );

  INSERT INTO public.dkd_logistics_applications (
    user_id,
    dkd_application_type,
    dkd_status,
    dkd_email_text,
    dkd_admin_note,
    dkd_payload,
    dkd_created_at,
    dkd_updated_at
  )
  VALUES (
    dkd_user_id_value,
    'logistics',
    'approved',
    'draborneagle@gmail.com',
    'DKD v0.47 SQL ile nakliye başvurusu onaylandı.',
    jsonb_build_object(
      'dkd_email_text_value', 'draborneagle@gmail.com',
      'dkd_approved_by_sql', true,
      'dkd_approved_at', now(),
      'dkd_source', 'dkd_20260502_approve_logistics_draborneagle_v0_47'
    ),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET dkd_status = 'approved',
        dkd_email_text = coalesce(public.dkd_logistics_applications.dkd_email_text, excluded.dkd_email_text),
        dkd_admin_note = excluded.dkd_admin_note,
        dkd_payload = coalesce(public.dkd_logistics_applications.dkd_payload, '{}'::jsonb) || excluded.dkd_payload,
        dkd_updated_at = now();

  RAISE NOTICE 'dkd_logistics_application_approved_for_user_id: %', dkd_user_id_value;
END $$;
