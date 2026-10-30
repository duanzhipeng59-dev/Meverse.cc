-- 邮箱验证码发送的全局原子锁:同一 邮箱+IP 60 秒内只有第一个请求能抢到,
-- 跨部署实例全局生效;抢不到的请求直接返回"已发送+剩余秒数",不再触发生成验证码与发信,
-- 杜绝双邮件/验证码被覆盖。
create table if not exists public.auth_email_code_locks (
  lock_key text primary key,
  next_allowed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.auth_email_code_locks enable row level security;
-- 不建 policy:RLS 全拒,仅 service_role 访问

-- 原子抢锁:条件 upsert(冷却已过才覆写),返回 0=抢到,>0=被锁剩余秒数
create or replace function public.try_acquire_email_code_lock(
  p_lock_key text,
  p_cooldown_seconds integer default 60
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_acquired timestamptz;
  v_retry_after integer;
begin
  insert into auth_email_code_locks (lock_key, next_allowed_at)
  values (p_lock_key, now() + make_interval(secs => p_cooldown_seconds))
  on conflict (lock_key) do update
    set next_allowed_at = excluded.next_allowed_at
    where auth_email_code_locks.next_allowed_at <= now()
  returning next_allowed_at into v_acquired;

  if v_acquired is not null then
    return 0;
  end if;

  select ceil(extract(epoch from (l.next_allowed_at - now())))::integer
    into v_retry_after
    from auth_email_code_locks l
    where l.lock_key = p_lock_key;

  return greatest(coalesce(v_retry_after, 1), 1);
end;
$$;

revoke all on function public.try_acquire_email_code_lock(text, integer) from public;
