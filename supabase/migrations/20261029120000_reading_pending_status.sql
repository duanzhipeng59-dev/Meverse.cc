-- 解读记录新增 pending 状态:进排盘确认页即落库,未点「开始解读」就退出时
-- 以「待生成」保留在生成记录里;点开始解读后推进为 generating。
alter table public.reading_reports
  drop constraint if exists reading_reports_status_check;

alter table public.reading_reports
  add constraint reading_reports_status_check
  check (status in ('pending', 'generating', 'ready', 'failed'));
