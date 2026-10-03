-- 双星合盘资金安全:扣款流水绑定报告 + 幂等退款(同一笔消费只能退一次) + 引擎评分列。
alter table public.dual_star_reports
  add column if not exists charge_ledger_id bigint references public.report_credit_ledger(id);

alter table public.dual_star_reports
  add column if not exists scores jsonb;

-- 退款唯一性:同一笔消费流水只允许一条退款记录
create unique index if not exists refund_once_idx
  on public.report_credit_ledger (order_no)
  where order_no like 'refund:%';

-- 消费并返回流水 id(供报告绑定与幂等退款)
create or replace function public.consume_credit_ledger(
  p_user_id uuid
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('report_credit:' || p_user_id::text));
  select coalesce(sum(delta), 0) into v_balance from report_credit_ledger where user_id = p_user_id;
  if v_balance < 1 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  insert into report_credit_ledger (user_id, delta, source)
  values (p_user_id, -1, 'consumption')
  returning id into v_id;
  return v_id;
end;
$$;

-- 幂等退款:按消费流水退回,重复调用安全(唯一索引兜底)
create or replace function public.refund_dual_charge(
  p_ledger_id bigint
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  perform pg_advisory_xact_lock(hashtext('refund:' || p_ledger_id::text));
  select user_id into v_user from report_credit_ledger where id = p_ledger_id;
  if v_user is null then
    return false;
  end if;
  if exists (select 1 from report_credit_ledger where order_no = 'refund:' || p_ledger_id) then
    return false;
  end if;
  insert into report_credit_ledger (user_id, delta, source, order_no)
  values (v_user, 1, 'refund', 'refund:' || p_ledger_id);
  return true;
end;
$$;

revoke execute on function public.consume_credit_ledger(uuid) from public, anon, authenticated;
revoke execute on function public.refund_dual_charge(bigint) from public, anon, authenticated;

-- 旧的按用户退款不再使用,删除以免误调
drop function if exists public.refund_report_credit(uuid, text);
