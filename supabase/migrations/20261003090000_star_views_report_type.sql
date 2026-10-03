-- 浏览记录按报告类型区分:bazi(AI生辰画像) / astrology(AI星盘解读)。
-- 旧记录无类型,默认 bazi(星盘报告为后加功能);解锁计费仍按(用户,明星)不分类型。

alter table public.star_report_views
  add column if not exists report_type text not null default 'bazi'
    check (report_type in ('bazi', 'astrology'));

alter table public.star_report_views
  add column if not exists first_viewed_at timestamptz not null default now();

alter table public.star_report_views drop constraint star_report_views_pkey;
alter table public.star_report_views add primary key (user_id, star_id, report_type);

drop function if exists public.record_star_report_view(uuid, text);

create or replace function public.record_star_report_view(
  p_user_id uuid,
  p_star_id text,
  p_report_type text default 'bazi'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_report_type not in ('bazi', 'astrology') then
    raise exception 'INVALID_REPORT_TYPE';
  end if;
  insert into public.star_report_views (user_id, star_id, report_type, view_count, last_viewed_at, first_viewed_at)
  values (p_user_id, p_star_id, p_report_type, 1, now(), now())
  on conflict (user_id, star_id, report_type)
  do update set view_count = public.star_report_views.view_count + 1,
                last_viewed_at = now();
end;
$$;
