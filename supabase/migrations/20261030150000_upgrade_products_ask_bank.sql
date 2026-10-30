-- 套餐购买:五商品新价格簿(报告次数+追问次数双额度) + 追问余额账本。
-- 消费规则:追问无免费额度,每问 1 条扣 1 次追问余额;生成报告扣 1 次报告次数。
-- 套餐履约时把 ask_credits 充进余额。旧商品 id 保留在约束里(历史订单行),但价格簿不再受理。

-- 1) 订单表加追问数字段
alter table public.report_credit_orders
  add column if not exists ask_credits integer not null default 0;

-- 2) 放宽 package_id 约束(旧 id 仅为历史行保留)
alter table public.report_credit_orders drop constraint if exists report_credit_orders_package_id_check;
alter table public.report_credit_orders
  add constraint report_credit_orders_package_id_check
  check (package_id in ('trial', 'explore', 'deep', 'single', 'pack_1', 'pack_5', 'pack_20',
                       'report_1', 'bundle_trial', 'bundle_adv', 'bundle_full', 'ask_30'));

-- 3) 追问余额账本
create table if not exists public.ask_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  source text not null check (source in ('purchase', 'consumption', 'refund')),
  order_no text,
  created_at timestamptz not null default now()
);
create index if not exists ask_credit_ledger_user_idx on public.ask_credit_ledger (user_id, created_at desc);
alter table public.ask_credit_ledger enable row level security;
-- 不建 policy:RLS 全拒,仅 service_role

-- 4) 新价格簿(服务端定价,双额度)
create or replace function public.create_report_credit_order(
  p_order_no text, p_user_id uuid, p_package_id text, p_token_hash text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_credits integer;
  v_ask_credits integer;
  v_amount numeric(10, 2);
begin
  select credits, ask_credits, amount into v_credits, v_ask_credits, v_amount
  from (values
    ('report_1',     1,   0,  50.00),
    ('bundle_trial', 3,  10,  89.00),
    ('bundle_adv',  10,  50, 239.00),
    ('bundle_full', 30, 300, 599.00),
    ('ask_30',       0,  30,  39.00)
  ) as packages(package_id, credits, ask_credits, amount)
  where packages.package_id = p_package_id;

  if v_credits is null then
    raise exception 'INVALID_PACKAGE';
  end if;

  insert into report_credit_orders (out_trade_no, access_token_hash, user_id, package_id, credits, ask_credits, amount)
  values (p_order_no, p_token_hash, p_user_id, p_package_id, v_credits, v_ask_credits, v_amount);
end;
$$;

-- 5) 履约:报告次数入 report_credit_ledger,追问次数入 ask_credit_ledger
create or replace function public.fulfill_report_credit_order(
  p_out_trade_no text, p_provider_trade_no text, p_provider_payload jsonb
) returns void
language plpgsql security definer set search_path = public
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

  if v_order.credits > 0 then
    insert into report_credit_ledger (user_id, delta, source, order_no)
    values (v_order.user_id, v_order.credits, 'purchase', p_out_trade_no);
  end if;
  if v_order.ask_credits > 0 then
    insert into ask_credit_ledger (user_id, delta, source, order_no)
    values (v_order.user_id, v_order.ask_credits, 'purchase', p_out_trade_no);
  end if;
end;
$$;

-- 6) 追问余额查询 / 扣减(不足抛错)
create or replace function public.get_ask_credit_bank(p_user_id uuid) returns integer
language sql security definer set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer from ask_credit_ledger where user_id = p_user_id;
$$;

create or replace function public.consume_ask_credit_bank(p_user_id uuid) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_balance integer;
begin
  perform pg_advisory_xact_lock(hashtext('ask_credit:' || p_user_id::text));
  select coalesce(sum(delta), 0) into v_balance from ask_credit_ledger where user_id = p_user_id;
  if v_balance < 1 then
    raise exception 'INSUFFICIENT_ASK_CREDITS';
  end if;
  insert into ask_credit_ledger (user_id, delta, source) values (p_user_id, -1, 'consumption');
  return v_balance - 1;
end;
$$;

revoke all on function public.get_ask_credit_bank(uuid) from public;
revoke all on function public.consume_ask_credit_bank(uuid) from public;
