create table if not exists public.myfate_generated_tests (
  id uuid primary key default gen_random_uuid(),
  star_id text not null,
  payload jsonb not null,
  provider text not null,
  model text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  constraint myfate_generated_tests_payload_object
    check (jsonb_typeof(payload) = 'object')
);

create index if not exists myfate_generated_tests_star_created_idx
  on public.myfate_generated_tests (star_id, created_at desc);

create index if not exists myfate_generated_tests_expires_idx
  on public.myfate_generated_tests (expires_at);

alter table public.myfate_generated_tests enable row level security;

drop policy if exists "deny client access to generated tests"
  on public.myfate_generated_tests;
create policy "deny client access to generated tests"
  on public.myfate_generated_tests
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.myfate_generated_tests from public, anon, authenticated;
grant select, insert, update, delete on public.myfate_generated_tests to service_role;

comment on table public.myfate_generated_tests is
  'Server-only generated fate tests. Payload includes hidden answer keys and prewritten rationales.';
