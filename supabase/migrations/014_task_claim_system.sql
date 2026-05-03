-- 013_task_claim_system.sql
-- TODO: frontend sabitleri ile DB görev ödülleri birebir eşleştirilmeli.

create or replace function public.dkd_task_claim(
  dkd_param_task_key text,
  dkd_param_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_task_claim');
end;
$$;

create or replace function public.dkd_weekly_task_claim(
  dkd_param_task_key text,
  dkd_param_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_weekly_task_claim');
end;
$$;
