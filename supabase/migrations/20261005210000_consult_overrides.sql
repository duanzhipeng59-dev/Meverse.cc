-- 生辰报告精校内容:按明星存整份 ConsultReport JSON,报告页优先读取
create table if not exists public.consult_overrides (
  star_id text primary key references public.celebrity_profiles(id) on delete cascade,
  content jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.consult_overrides enable row level security;
-- 仅 service_role 读写,公共角色一律拒绝
drop policy if exists "consult_overrides deny all" on public.consult_overrides;
