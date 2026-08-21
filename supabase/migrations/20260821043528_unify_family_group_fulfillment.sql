-- Applied to the WildGPT project as migration version 20260821043528.
alter table public.payment_orders
  drop constraint if exists payment_orders_status_check;

alter table public.payment_orders
  add constraint payment_orders_status_check
  check (status in ('pending', 'paid', 'fulfilled', 'failed', 'cancelled', 'returned'));

alter table public.payment_orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists returned_at timestamptz,
  add column if not exists return_reason text
    check (return_reason is null or char_length(return_reason) between 1 and 1000);

update public.gemini_account_inventory as inventory
set status = 'available',
    reserved_order_no = null,
    reserved_at = null,
    updated_at = now()
from public.payment_orders as orders
where orders.inventory_id = inventory.id
  and orders.status = 'pending'
  and inventory.status = 'reserved';

update public.payment_orders
set inventory_id = null,
    updated_at = now()
where status = 'pending'
  and inventory_id is not null;

create or replace function public.create_payment_order(
  p_out_trade_no text,
  p_access_token_hash text,
  p_user_id uuid,
  p_billing_mode text,
  p_duration_months integer,
  p_product_name text,
  p_amount numeric,
  p_delivery_email text,
  p_account_region text
)
returns table (order_no text, order_status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_billing_mode <> 'monthly' then
    raise exception 'INVALID_BILLING_MODE';
  end if;

  if p_duration_months not in (1, 3, 6, 12) then
    raise exception 'INVALID_DURATION';
  end if;

  if nullif(trim(p_delivery_email), '') is null
     or nullif(trim(p_account_region), '') is null then
    raise exception 'INVALID_ACCOUNT_DETAILS';
  end if;

  insert into public.payment_orders (
    out_trade_no,
    access_token_hash,
    user_id,
    billing_mode,
    duration_months,
    product_name,
    amount,
    delivery_email,
    account_region
  ) values (
    p_out_trade_no,
    p_access_token_hash,
    p_user_id,
    'monthly',
    p_duration_months,
    p_product_name,
    p_amount,
    trim(p_delivery_email),
    trim(p_account_region)
  );

  return query select p_out_trade_no, 'pending'::text;
end;
$$;

create or replace function public.fulfill_payment_order(
  p_out_trade_no text,
  p_provider_trade_no text,
  p_provider_payload jsonb
)
returns table (order_status text, inventory_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders%rowtype;
begin
  select * into v_order
    from public.payment_orders
    where out_trade_no = p_out_trade_no
    for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status in ('paid', 'fulfilled', 'returned') then
    return query select v_order.status, v_order.inventory_id;
    return;
  end if;

  update public.payment_orders
    set status = 'paid',
        provider_trade_no = coalesce(nullif(p_provider_trade_no, ''), provider_trade_no),
        provider_payload = coalesce(p_provider_payload, provider_payload),
        paid_at = coalesce(paid_at, now()),
        cancelled_at = null,
        updated_at = now()
    where out_trade_no = p_out_trade_no
    returning status, public.payment_orders.inventory_id
      into v_order.status, v_order.inventory_id;

  return query select v_order.status, v_order.inventory_id;
end;
$$;

revoke all on function public.create_payment_order(
  text, text, uuid, text, integer, text, numeric, text, text
) from public, anon, authenticated;
grant execute on function public.create_payment_order(
  text, text, uuid, text, integer, text, numeric, text, text
) to service_role;

revoke all on function public.fulfill_payment_order(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fulfill_payment_order(text, text, jsonb)
  to service_role;
