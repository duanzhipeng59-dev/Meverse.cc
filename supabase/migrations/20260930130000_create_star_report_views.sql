-- 浏览记录:按用户记录打开过的明星正缘报告(次数 + 最近时间)
create table if not exists public.star_report_views (
  user_id uuid not null references auth.users (id) on delete cascade,
  star_id text not null references public.celebrity_profiles (id) on delete cascade,
  view_count integer not null default 1,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, star_id)
);

alter table public.star_report_views enable row level security;
-- 不建任何 policy:RLS 全拒,仅 service role 访问

-- 原子记录一次浏览:存在则次数+1并刷新时间
create or replace function public.record_star_report_view(p_user_id uuid, p_star_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.star_report_views (user_id, star_id, view_count, last_viewed_at)
  values (p_user_id, p_star_id, 1, now())
  on conflict (user_id, star_id)
  do update set view_count = public.star_report_views.view_count + 1,
                last_viewed_at = now();
end;
$$;
