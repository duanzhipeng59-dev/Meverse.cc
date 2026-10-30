-- 解读次数包计费:新价格簿 + 按报告幂等消费/退款 + 收费模式开关翻回。
-- 模型:充值次数包(支付宝/易支付),生成解读报告扣 1 次,生成失败自动退款;
-- 消费与退款都以 order_no='reading:{reportId}' 幂等,回调/重试不会重复记账。

-- 1. 次数包价格簿:新包 pack_1/5/20;约束保留旧套餐名(trial/explore/deep/single),
--    因为表里存在旧套餐的历史订单行,收紧会违反约束。旧包名无法再下单(RPC 定价只认新包)。
alter table public.report_credit_orders drop constraint if exists report_credit_orders_package_id_check;
alter table public.report_credit_orders
  add constraint report_credit_orders_package_id_check
  check (package_id in ('trial', 'explore', 'deep', 'single', 'pack_1', 'pack_5', 'pack_20'));

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
  -- 服务端定价:客户端只能传 package_id,不能传价格与次数
  select credits, amount into v_credits, v_amount
  from (values
    ('pack_1', 1, 19.90),
    ('pack_5', 5, 69.00),
    ('pack_20', 20, 199.00)
  ) as packages(package_id, credits, amount)
  where packages.package_id = p_package_id;

  if v_credits is null then
    raise exception 'INVALID_PACKAGE';
  end if;

  insert into report_credit_orders (out_trade_no, access_token_hash, user_id, package_id, credits, amount)
  values (p_order_no, p_token_hash, p_user_id, p_package_id, v_credits, v_amount);
end;
$$;

-- 2. 生成解读报告时扣 1 次:按报告幂等(同一报告重复调用只扣一次),不足抛错
create or replace function public.consume_report_credit_for_reading(
  p_user_id uuid,
  p_report_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  -- 同一报告已扣过费:幂等返回当前余额(重试/重复点击不双扣)
  if exists (
    select 1 from report_credit_ledger
    where user_id = p_user_id and order_no = 'reading:' || p_report_id::text
  ) then
    select coalesce(sum(delta), 0) into v_balance
    from report_credit_ledger where user_id = p_user_id;
    return v_balance;
  end if;

  -- 与旧 consume_report_credit 同一把用户锁,防止并发生成竞态
  perform pg_advisory_xact_lock(hashtext('report_credit:' || p_user_id::text));

  select coalesce(sum(delta), 0) into v_balance
  from report_credit_ledger
  where user_id = p_user_id;

  if v_balance < 1 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into report_credit_ledger (user_id, delta, source, order_no)
  values (p_user_id, -1, 'consumption', 'reading:' || p_report_id::text);

  return v_balance - 1;
end;
$$;

-- 3. 生成失败退款:仅当该报告确实扣过费且未退过(refund_once_idx 唯一索引兜底)
create or replace function public.refund_reading_credit(
  p_user_id uuid,
  p_report_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from report_credit_ledger
    where user_id = p_user_id
      and order_no = 'reading:' || p_report_id::text
      and delta = -1
  ) then
    return; -- 未扣过费(如免费期生成),无款可退
  end if;

  insert into report_credit_ledger (user_id, delta, source, order_no)
  values (p_user_id, 1, 'refund', 'refund:reading:' || p_report_id::text)
  on conflict (order_no) where order_no like 'refund:%' do nothing;
end;
$$;

revoke all on function public.consume_report_credit_for_reading(uuid, uuid) from public;
revoke all on function public.refund_reading_credit(uuid, uuid) from public;

-- 4. 追问按报告计次:独立用量表,清空对话(级联删消息)不清零,防绕过。
-- report_key 即追问会话 key(明星报告=明星id,个人解读='reading:'||报告id)。
create table if not exists public.ask_question_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  report_key text not null,
  report_type text not null check (report_type in ('bazi', 'astrology', 'dual')),
  asked_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, report_key, report_type)
);

alter table public.ask_question_usage enable row level security;
-- 不建 policy:RLS 全拒,仅 service_role

create or replace function public.record_ask_question(
  p_user_id uuid,
  p_report_key text,
  p_report_type text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into ask_question_usage (user_id, report_key, report_type, asked_count)
  values (p_user_id, p_report_key, p_report_type, 1)
  on conflict (user_id, report_key, report_type)
  do update set asked_count = ask_question_usage.asked_count + 1, updated_at = now()
  returning asked_count into v_count;
  return v_count;
end;
$$;

revoke all on function public.record_ask_question(uuid, text, text) from public;

-- 5. 计费开关翻回收费(追问的旧全局计量读它;新代码不再读)。
-- 注意:执行迁移到部署新代码之间的小窗口内,旧追问接口会按余额 0 拒绝——迁移紧贴部署执行。
update public.app_settings set value = 'true', updated_at = now()
where key = 'upgrades_enabled';
