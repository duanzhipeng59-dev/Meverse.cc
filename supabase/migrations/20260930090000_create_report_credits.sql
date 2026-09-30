-- Report credit packages: orders + ledger + atomic grant/consume RPCs.
-- Prices are hard-coded server-side to prevent tampering with client input.

create table if not exists public.report_credit_orders (
  id uuid primary key default gen_random_uuid(),
  out_trade_no text not null unique,
  access_token_hash text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id text not null check (package_id in ('trial', 'explore', 'deep', 'single')),
  credits integer not null check (credits > 0),
  amount numeric(10, 2) not null check (amount > 0),
  payment_type text not null default 'alipay' check (payment_type in ('alipay')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  provider_trade_no text,
  provider_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists report_credit_orders_user_idx
  on public.report_credit_orders (user_id, created_at desc);

create table if not exists public.report_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  source text not null check (source in ('purchase', 'consumption', 'grant')),
  order_no text,
  created_at timestamptz not null default now()
);

create index if not exists report_credit_ledger_user_idx
  on public.report_credit_ledger (user_id, created_at desc);

alter table public.report_credit_orders enable row level security;
alter table public.report_credit_ledger enable row level security;

create policy "deny client access to report credit orders"
  on public.report_credit_orders
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "deny client access to report credit ledger"
  on public.report_credit_ledger
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.create_report_credit_order(
  p_order_no text,
  p_user_id uuid,
  p_package_id text,
  p_token_hash text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
  v_amount numeric(10, 2);
begin
  -- Server-side price book: client cannot choose credits or amount.
  select credits, amount into v_credits, v_amount
  from (values
    ('trial', 3, 89.00),
    ('explore', 10, 239.00),
    ('deep', 30, 499.00),
    ('single', 1, 50.00)
  ) as packages(package_id, credits, amount)
  where packages.package_id = p_package_id;

  if v_credits is null then
    raise exception 'INVALID_PACKAGE';
  end if;

  insert into report_credit_orders (out_trade_no, access_token_hash, user_id, package_id, credits, amount)
  values (p_order_no, p_token_hash, p_user_id, p_package_id, v_credits, v_amount);
end;
$$;

create or replace function public.fulfill_report_credit_order(
  p_out_trade_no text,
  p_provider_trade_no text,
  p_provider_payload jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  select * into v_order from report_credit_orders
  where out_trade_no = p_out_trade_no
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status <> 'pending' then
    return; -- idempotent
  end if;

  update report_credit_orders
  set status = 'paid',
      provider_trade_no = p_provider_trade_no,
      provider_payload = p_provider_payload,
      paid_at = now(),
      updated_at = now()
  where out_trade_no = p_out_trade_no;

  insert into report_credit_ledger (user_id, delta, source, order_no)
  values (v_order.user_id, v_order.credits, 'purchase', p_out_trade_no);
end;
$$;

create or replace function public.consume_report_credit(
  p_user_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  -- Advisory lock keeps concurrent report generations from racing the check.
  perform pg_advisory_xact_lock(hashtext('report_credit:' || p_user_id::text));

  select coalesce(sum(delta), 0) into v_balance
  from report_credit_ledger
  where user_id = p_user_id;

  if v_balance < 1 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into report_credit_ledger (user_id, delta, source)
  values (p_user_id, -1, 'consumption');

  return v_balance - 1;
end;
$$;

create or replace function public.get_report_credits(
  p_user_id uuid
) returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
  from report_credit_ledger
  where user_id = p_user_id;
$$;

revoke all on function public.create_report_credit_order(text, uuid, text, text) from public;
revoke all on function public.fulfill_report_credit_order(text, text, jsonb) from public;
revoke all on function public.consume_report_credit(uuid) from public;
revoke all on function public.get_report_credits(uuid) from public;
