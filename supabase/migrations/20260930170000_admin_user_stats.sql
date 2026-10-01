-- 管理后台·用户管理:注册/额度/浏览聚合 + DNU 统计 + 手动加额度。
-- 全部 security definer 且仅 service role 可执行(revoke public/anon/authenticated)。

create or replace function public.admin_user_overview()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  report_balance bigint,
  ask_remaining bigint,
  view_count bigint,
  paid_amount numeric
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    coalesce(l.report_balance, 0),
    coalesce(l.granted, 0) * 10 - coalesce(l.ask_used, 0),
    coalesce(v.view_count, 0),
    coalesce(o.paid_amount, 0)
  from auth.users u
  left join (
    select user_id,
      sum(delta) as report_balance,
      sum(delta) filter (where source in ('purchase', 'grant')) as granted,
      count(*) filter (where source = 'ask_consumption') as ask_used
    from public.report_credit_ledger
    group by user_id
  ) l on l.user_id = u.id
  left join (
    select user_id, count(*) as view_count
    from public.star_report_views
    group by user_id
  ) v on v.user_id = u.id
  left join (
    select user_id, sum(amount) as paid_amount
    from public.report_credit_orders
    where status = 'paid'
    group by user_id
  ) o on o.user_id = u.id
  order by u.created_at desc
  limit 500
$$;

create or replace function public.admin_daily_new_users(p_days int default 30)
returns table (day date, count bigint)
language sql
security definer
set search_path = public, auth
as $$
  select d::date as day, count(u.id)
  from generate_series(current_date - (coalesce(p_days, 30) - 1), current_date, interval '1 day') d
  left join auth.users u on u.created_at::date = d::date
  group by d
  order by d
$$;

create or replace function public.admin_grant_credits(p_user_id uuid, p_credits int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credits is null or p_credits <= 0 or p_credits > 1000 then
    raise exception 'INVALID_CREDITS';
  end if;
  insert into public.report_credit_ledger (user_id, delta, source)
  values (p_user_id, p_credits, 'grant');
end;
$$;

revoke execute on function public.admin_user_overview() from public, anon, authenticated;
revoke execute on function public.admin_daily_new_users(int) from public, anon, authenticated;
revoke execute on function public.admin_grant_credits(uuid, int) from public, anon, authenticated;
