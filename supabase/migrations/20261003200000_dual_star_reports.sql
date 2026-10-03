-- 双星合盘:两位明星的合盘报告(状态机 pending→generating→ready/failed)+ 额度退款 + 追问会话支持 dual 类型。
create table if not exists public.dual_star_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  star_a text not null references public.celebrity_profiles(id) on delete cascade,
  star_b text not null references public.celebrity_profiles(id) on delete cascade,
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  keywords jsonb not null default '[]'::jsonb,
  summary text not null default '',
  content jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dual_star_reports_user_idx on public.dual_star_reports (user_id, created_at desc);
create index if not exists dual_star_reports_pair_idx on public.dual_star_reports (user_id, star_a, star_b);

alter table public.dual_star_reports enable row level security;
create policy "deny client access to dual star reports"
  on public.dual_star_reports
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- 额度退款(生成失败自动退回):source 放宽 + 专用 RPC
alter table public.report_credit_ledger drop constraint if exists report_credit_ledger_source_check;
alter table public.report_credit_ledger add constraint report_credit_ledger_source_check
  check (source in ('purchase', 'consumption', 'ask_consumption', 'grant', 'refund'));

create or replace function public.refund_report_credit(
  p_user_id uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into report_credit_ledger (user_id, delta, source, order_no)
  values (p_user_id, 1, 'refund', p_reason);
end;
$$;

revoke execute on function public.refund_report_credit(uuid, text) from public, anon, authenticated;

-- 追问会话:star_id 不再限定单星(dual 时存报告 id),类型加 'dual'
alter table public.ask_conversations drop constraint if exists ask_conversations_star_id_fkey;
alter table public.ask_conversations drop constraint if exists ask_conversations_report_type_check;
alter table public.ask_conversations add constraint ask_conversations_report_type_check
  check (report_type in ('bazi', 'astrology', 'dual'));
