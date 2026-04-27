-- 011_market_system.sql
-- TODO: duplicate listing koruması, burned/sold card koruması, transaction bazlı token transferi.

create or replace function public.dkd_market_list_card(
  dkd_param_user_card_id bigint,
  dkd_param_price_token integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id bigint;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_market_listings(seller_id, user_card_id, price_token, fee_token, status)
  values (auth.uid(), dkd_param_user_card_id, greatest(coalesce(dkd_param_price_token, 0), 1), greatest(floor(coalesce(dkd_param_price_token, 0) * 0.10), 0), 'active')
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

create or replace function public.dkd_market_cancel(dkd_param_listing_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dkd_market_listings
  set status = 'cancelled', canceled_at = now()
  where id = dkd_param_listing_id and seller_id = auth.uid() and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_found_or_forbidden');
  end if;

  return jsonb_build_object('ok', true, 'listing_id', dkd_param_listing_id);
end;
$$;

create or replace function public.dkd_market_buy(dkd_param_listing_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_market_buy');
end;
$$;
