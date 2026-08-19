create table if not exists public.gemini_account_inventory (
  id uuid primary key default gen_random_uuid(),
  account_email_encrypted text not null,
  account_password_encrypted text not null,
  status text not null default 'available'
    check (status in ('available', 'reserved', 'sold')),
  reserved_order_no text unique,
  reserved_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  out_trade_no text not null unique,
  access_token_hash text not null,
  user_id uuid references auth.users(id) on delete set null,
  billing_mode text not null check (billing_mode in ('monthly', 'annual')),
  duration_months integer not null check (duration_months in (1, 3, 6, 12)),
  product_name text not null,
  amount numeric(10, 2) not null check (amount > 0),
  payment_type text not null default 'alipay' check (payment_type in ('alipay')),
  delivery_email text not null,
  account_region text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'fulfilled', 'failed')),
  provider_trade_no text,
  provider_payload jsonb,
  inventory_id uuid references public.gemini_account_inventory(id),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_status_idx
  on public.payment_orders (status, created_at desc);

create index if not exists payment_orders_user_id_idx
  on public.payment_orders (user_id, created_at desc);

create index if not exists payment_orders_inventory_id_idx
  on public.payment_orders (inventory_id);

create index if not exists gemini_account_inventory_status_idx
  on public.gemini_account_inventory (status, created_at);

alter table public.payment_orders enable row level security;
alter table public.gemini_account_inventory enable row level security;

create policy "deny client access to payment orders"
  on public.payment_orders
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "deny client access to account inventory"
  on public.gemini_account_inventory
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.payment_orders from anon, authenticated;
revoke all on public.gemini_account_inventory from anon, authenticated;
grant select, insert, update on public.payment_orders to service_role;
grant select, insert, update on public.gemini_account_inventory to service_role;

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
declare
  v_inventory_id uuid;
begin
  if p_billing_mode not in ('monthly', 'annual') then
    raise exception 'INVALID_BILLING_MODE';
  end if;

  if p_billing_mode = 'annual' then
    select inventory.id
      into v_inventory_id
      from public.gemini_account_inventory as inventory
      where inventory.status = 'available'
      order by inventory.created_at
      for update skip locked
      limit 1;

    if v_inventory_id is null then
      raise exception 'OUT_OF_STOCK';
    end if;

    update public.gemini_account_inventory
      set status = 'reserved',
          reserved_order_no = p_out_trade_no,
          reserved_at = now(),
          updated_at = now()
      where id = v_inventory_id;
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
    account_region,
    inventory_id
  ) values (
    p_out_trade_no,
    p_access_token_hash,
    p_user_id,
    p_billing_mode,
    p_duration_months,
    p_product_name,
    p_amount,
    p_delivery_email,
    p_account_region,
    v_inventory_id
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

  if v_order.status in ('paid', 'fulfilled') then
    return query select v_order.status, v_order.inventory_id;
    return;
  end if;

  if v_order.billing_mode = 'annual' then
    update public.gemini_account_inventory
      set status = 'sold',
          sold_at = now(),
          updated_at = now()
      where id = v_order.inventory_id
        and status = 'reserved'
        and reserved_order_no = v_order.out_trade_no;

    if not found then
      raise exception 'RESERVED_ACCOUNT_NOT_FOUND';
    end if;
  end if;

  update public.payment_orders
    set status = case
          when billing_mode = 'annual' then 'fulfilled'
          else 'paid'
        end,
        provider_trade_no = coalesce(p_provider_trade_no, provider_trade_no),
        provider_payload = coalesce(p_provider_payload, provider_payload),
        paid_at = coalesce(paid_at, now()),
        fulfilled_at = case
          when billing_mode = 'annual' then coalesce(fulfilled_at, now())
          else fulfilled_at
        end,
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
