create table if not exists public.myfate_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  star_id text not null,
  star_name text not null,
  star_portrait text not null,
  status text not null default 'initial'
    check (status in ('initial', 'generating', 'advanced')),
  score smallint not null check (score between 0 and 100),
  behavior_scores jsonb,
  question_count smallint check (question_count is null or question_count between 1 and 64),
  initial_title text not null,
  answers jsonb not null default '[]'::jsonb,
  interpretation jsonb,
  interpretation_source text
    check (interpretation_source is null or interpretation_source in ('deepseek', 'gemini')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists myfate_reports_user_created_idx
  on public.myfate_reports (user_id, created_at desc);

create index if not exists myfate_reports_user_star_created_idx
  on public.myfate_reports (user_id, star_id, created_at desc);

alter table public.myfate_reports enable row level security;

create policy "deny direct client access to myfate reports"
  on public.myfate_reports
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.myfate_reports from public, anon, authenticated;
grant select, insert, update, delete on public.myfate_reports to service_role;
