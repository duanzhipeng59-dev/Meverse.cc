-- The local operations console and the product now share one managed question bank.
-- Keep this table server-only: both surfaces access it with the Supabase secret key.
alter table public.myfate_question_bank
  drop constraint if exists myfate_question_bank_star_id_fkey;

alter table public.myfate_question_bank
  drop constraint if exists myfate_question_bank_dimension_check;

alter table public.myfate_question_bank
  add constraint myfate_question_bank_dimension_check
  check (dimension in (
    'security',
    'expression',
    'independence',
    'conflict',
    'novelty',
    'boundaries',
    'support',
    'rhythm'
  ));

alter table public.myfate_question_bank enable row level security;

drop policy if exists "deny direct client access to question bank"
  on public.myfate_question_bank;
create policy "deny direct client access to question bank"
  on public.myfate_question_bank
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.myfate_question_bank from public, anon, authenticated;
grant select, insert, update, delete on public.myfate_question_bank to service_role;

comment on table public.myfate_question_bank is
  'Server-managed Myfate question bank. Local operations writes and the online product reads this table directly.';
