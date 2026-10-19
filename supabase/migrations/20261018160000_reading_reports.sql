-- 解读页:用户自填人物的单/双人八字解读报告(与偶像合盘并行的自填体系,单/双统一状态机)。
-- subject 为 {name,gender,birthDate,birthTime,cityId,cityName} JSONB;content 单人=ConsultOverrideContent 结构,双人=DualReportContent 结构。
create table if not exists public.reading_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('single', 'dual')),
  dual_type text not null default 'love' check (dual_type in ('love', 'career')),
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  subject_a jsonb not null,
  subject_b jsonb,
  error text,
  content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reading_reports_user_idx on public.reading_reports (user_id, created_at desc);

alter table public.reading_reports enable row level security;

drop policy if exists "deny client access to reading reports" on public.reading_reports;
create policy "deny client access to reading reports"
  on public.reading_reports
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.reading_reports from public, anon, authenticated;
grant select, insert, update, delete on public.reading_reports to service_role;

comment on table public.reading_reports is
  'User-submitted birth info readings (single/dual). Server routes enforce user_id ownership.';
