-- AI 追问记录持久化:按(用户,明星,报告类型)一组对话;消息含 sending/completed/failed 状态。
create table if not exists public.ask_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  star_id text not null references public.celebrity_profiles(id) on delete cascade,
  report_type text not null check (report_type in ('bazi', 'astrology')),
  summary text not null default '',
  summarized_count integer not null default 0,
  message_count integer not null default 0,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, star_id, report_type)
);

create table if not exists public.ask_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.ask_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  status text not null default 'completed' check (status in ('sending', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ask_messages_conversation_idx on public.ask_messages (conversation_id, id desc);

alter table public.ask_conversations enable row level security;
alter table public.ask_messages enable row level security;
-- 无 policy:RLS 全拒,仅 service role(服务端会话)访问

-- 原子追加/计数(避免并发双计)
create or replace function public.ask_append_messages(
  p_conversation_id uuid,
  p_user_id uuid,
  p_user_content text,
  p_assistant_content text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select message_count into v_count from public.ask_conversations where id = p_conversation_id for update;
  insert into public.ask_messages (conversation_id, user_id, role, content, status)
  values (p_conversation_id, p_user_id, 'user', p_user_content, 'completed'),
         (p_conversation_id, p_user_id, 'assistant', p_assistant_content, 'completed');
  update public.ask_conversations
     set message_count = coalesce(v_count, 0) + 2,
         last_message_at = now(),
         updated_at = now()
   where id = p_conversation_id;
end;
$$;
