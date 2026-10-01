-- 追问额度:每 1 次解读(购买/赠送)附赠 10 次追问。
-- 追问消耗记录在 report_credit_ledger(source='ask_consumption', delta=0),
-- 剩余 = sum(purchase/grant delta) × 10 − ask_consumption 行数,不占用解读余额。

alter table public.report_credit_ledger
  drop constraint report_credit_ledger_source_check;

alter table public.report_credit_ledger
  add constraint report_credit_ledger_source_check
  check (source in ('purchase', 'consumption', 'grant', 'ask_consumption'));

create or replace function public.remaining_ask_credits(p_user_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(delta) filter (where source in ('purchase', 'grant')), 0) * 10
       - count(*) filter (where source = 'ask_consumption')
  from public.report_credit_ledger
  where user_id = p_user_id;
$$;

create or replace function public.consume_ask_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  select coalesce(sum(delta) filter (where source in ('purchase', 'grant')), 0) * 10
       - count(*) filter (where source = 'ask_consumption')
    into remaining
    from public.report_credit_ledger
    where user_id = p_user_id;

  if remaining <= 0 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.report_credit_ledger (user_id, delta, source)
  values (p_user_id, 0, 'ask_consumption');

  return remaining - 1;
end;
$$;
