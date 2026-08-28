create table if not exists public.myfate_custom_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  role text not null check (char_length(role) between 1 and 80),
  tagline text not null check (char_length(tagline) between 1 and 160),
  description text not null check (char_length(description) between 1 and 1200),
  relationship_style text not null check (char_length(relationship_style) between 1 and 160),
  focus text not null check (char_length(focus) between 1 and 240),
  mbti text not null check (mbti ~ '^(?:E|I)(?:N|S)(?:F|T)(?:J|P)$'),
  birth_date date not null,
  three_pillars text not null check (char_length(three_pillars) between 3 and 80),
  traits jsonb not null default '[]'::jsonb check (jsonb_typeof(traits) = 'array'),
  portrait_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists myfate_custom_targets_user_created_idx
  on public.myfate_custom_targets (user_id, created_at desc);

alter table public.myfate_custom_targets enable row level security;

drop policy if exists "deny direct client access to custom targets"
  on public.myfate_custom_targets;
create policy "deny direct client access to custom targets"
  on public.myfate_custom_targets
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.myfate_custom_targets from public, anon, authenticated;
grant select, insert, update, delete on public.myfate_custom_targets to service_role;

comment on table public.myfate_custom_targets is
  'Private user-created relationship test targets. Server routes enforce user_id ownership.';
