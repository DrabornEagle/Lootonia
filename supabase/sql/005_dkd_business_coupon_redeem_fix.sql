begin;

update public.dkd_business_coupons
set coupon_code = upper(coupon_code)
where coupon_code is not null
  and coupon_code <> upper(coupon_code);

update public.dkd_business_coupon_uses
set coupon_code = upper(coupon_code)
where coupon_code is not null
  and coupon_code <> upper(coupon_code);

create or replace function public.dkd_business_redeem_coupon(
  dkd_param_business_id uuid,
  dkd_param_coupon_code text,
  dkd_param_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_coupon public.dkd_business_coupons%rowtype;
  dkd_var_use_id uuid;
  dkd_var_code text;
  dkd_var_norm_code text;
begin
  if coalesce(public.dkd_is_admin(), false) is not true and coalesce(public.dkd_business_is_member(auth.uid()), false) is not true then
    raise exception 'business_role_required';
  end if;

  dkd_var_code := upper(trim(coalesce(dkd_param_coupon_code, '')));
  dkd_var_norm_code := regexp_replace(dkd_var_code, '[^A-Z0-9]+', '', 'g');

  select *
    into dkd_var_coupon
  from public.dkd_business_coupons
  where business_id = dkd_param_business_id
    and regexp_replace(upper(coalesce(coupon_code, '')), '[^A-Z0-9]+', '', 'g') = dkd_var_norm_code
  order by created_at desc
  limit 1;

  if dkd_var_coupon.id is null then
    return jsonb_build_object('ok', false, 'reason', 'coupon_not_found');
  end if;

  if dkd_var_coupon.status = 'redeemed' or dkd_var_coupon.redeemed_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'coupon_already_redeemed');
  end if;

  if dkd_var_coupon.expires_at is not null and dkd_var_coupon.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'coupon_expired');
  end if;

  update public.dkd_business_coupons
  set status = 'redeemed',
      redeemed_at = now(),
      updated_at = now(),
      meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('cashier_note', nullif(trim(coalesce(dkd_param_note, '')), ''))
  where id = dkd_var_coupon.id;

  dkd_var_use_id := public.dkd_business_coupon_use_log(
    dkd_var_coupon.business_id,
    dkd_var_coupon.player_id,
    upper(dkd_var_coupon.coupon_code),
    dkd_var_coupon.task_key,
    dkd_var_coupon.campaign_id,
    dkd_var_coupon.id,
    jsonb_build_object('redeem_note', nullif(trim(coalesce(dkd_param_note, '')), ''))
  );

  return jsonb_build_object(
    'ok', true,
    'coupon_id', dkd_var_coupon.id,
    'coupon_code', upper(dkd_var_coupon.coupon_code),
    'coupon_use_id', dkd_var_use_id,
    'campaign_id', dkd_var_coupon.campaign_id,
    'player_id', dkd_var_coupon.player_id
  );
end;
$$;

grant execute on function public.dkd_business_redeem_coupon(uuid, text, text) to authenticated;

commit;
