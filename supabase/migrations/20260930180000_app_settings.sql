-- 全站功能开关:管理后台可切换,产品端只读。
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
-- 不建 policy:RLS 全拒,仅 service role 访问

insert into public.app_settings (key, value) values ('upgrades_enabled', 'true')
on conflict (key) do nothing;
