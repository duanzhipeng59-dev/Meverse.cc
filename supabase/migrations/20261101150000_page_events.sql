-- 页面事件轻埋点:关键页面进入记录(带 user_id + 来源),补 GA4 无法逐用户归因的缺口。
-- 目前只有订阅页 upgrade_page_view;写入方是服务端路由 app/api/track/page(允许清单校验)。
create table if not exists public.page_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null,
  source text not null default 'direct',
  created_at timestamptz not null default now()
);

create index if not exists page_events_user_idx on public.page_events (user_id, created_at desc);
create index if not exists page_events_event_idx on public.page_events (event, created_at desc);

alter table public.page_events enable row level security;

-- 同 reading_reports:客户端全拒,仅 service_role(服务端路由)写、分析脚本读
revoke all on public.page_events from public, anon, authenticated;
grant select, insert on public.page_events to service_role;

comment on table public.page_events is
  'Server-side page-view events with user attribution (upgrade page entry, etc.).';
