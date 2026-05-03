begin;

create or replace function public.dkd_send_support_thread_message(
  dkd_param_thread_id uuid,
  dkd_param_message_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_auth_user_id uuid := auth.uid();
  dkd_var_is_admin boolean := coalesce(public.dkd_is_admin(), false);
  dkd_var_thread_record public.dkd_support_threads%rowtype;
  dkd_var_clean_message_text text;
  dkd_var_sender_key text;
  dkd_var_sender_title text;
  dkd_var_message_owner_id uuid;
  dkd_var_next_status_key text;
  dkd_var_next_status_title text;
  dkd_var_message_id uuid;
begin
  if dkd_var_auth_user_id is null then
    raise exception 'dkd_auth_required';
  end if;

  dkd_var_clean_message_text := trim(coalesce(dkd_param_message_text, ''));

  if length(dkd_var_clean_message_text) < 2 then
    raise exception 'dkd_support_message_too_short';
  end if;

  select dkd_support_threads.*
    into dkd_var_thread_record
  from public.dkd_support_threads as dkd_support_threads
  where dkd_support_threads.dkd_id = dkd_param_thread_id
    and (
      dkd_support_threads.dkd_user_id = dkd_var_auth_user_id
      or dkd_var_is_admin
    )
  limit 1;

  if not found then
    raise exception 'dkd_support_thread_not_found';
  end if;

  if dkd_var_is_admin then
    dkd_var_sender_key := 'dkd_admin';
    dkd_var_sender_title := 'Destek Ekibi';
    dkd_var_message_owner_id := dkd_var_thread_record.dkd_user_id;
    dkd_var_next_status_key := 'dkd_answered';
    dkd_var_next_status_title := 'Destek yanıtladı';
  else
    dkd_var_sender_key := 'dkd_customer';
    dkd_var_sender_title := 'Müşteri';
    dkd_var_message_owner_id := dkd_var_auth_user_id;
    dkd_var_next_status_key := 'dkd_open';
    dkd_var_next_status_title := 'Müşteri yanıtladı';
  end if;

  insert into public.dkd_support_messages (
    dkd_thread_id,
    dkd_user_id,
    dkd_sender_key,
    dkd_sender_title,
    dkd_message_text
  ) values (
    dkd_var_thread_record.dkd_id,
    dkd_var_message_owner_id,
    dkd_var_sender_key,
    dkd_var_sender_title,
    dkd_var_clean_message_text
  )
  returning dkd_id into dkd_var_message_id;

  update public.dkd_support_threads
  set
    dkd_status_key = dkd_var_next_status_key,
    dkd_status_title = dkd_var_next_status_title,
    dkd_last_message_text = left(dkd_var_clean_message_text, 240),
    dkd_updated_at = timezone('utc', now())
  where dkd_id = dkd_var_thread_record.dkd_id;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_thread_id', dkd_var_thread_record.dkd_id,
    'dkd_message_id', dkd_var_message_id,
    'dkd_sender_key', dkd_var_sender_key,
    'dkd_sender_title', dkd_var_sender_title,
    'dkd_status_key', dkd_var_next_status_key,
    'dkd_status_title', dkd_var_next_status_title
  );
end;
$$;

revoke all on function public.dkd_send_support_thread_message(uuid, text) from public;
grant execute on function public.dkd_send_support_thread_message(uuid, text) to authenticated;

commit;
