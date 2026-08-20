create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'superadmin'
    check (role in ('superadmin', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_order_notes (
  id uuid primary key default gen_random_uuid(),
  order_no text not null references public.payment_orders(out_trade_no) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text not null check (char_length(note) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_order_notes_order_no_idx
  on public.admin_order_notes (order_no, created_at desc);
create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs (actor_user_id, created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_order_notes enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on public.admin_users from anon, authenticated;
revoke all on public.admin_order_notes from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;
grant select, insert, update on public.admin_users to service_role;
grant select, insert on public.admin_order_notes to service_role;
grant select, insert on public.admin_audit_logs to service_role;
