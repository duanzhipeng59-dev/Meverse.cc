-- 补齐明星卡片的专属报告提示词独立列。
-- 线上 Studio 保存明星卡片时会写入 report_prompt 列（新增与编辑共用），
-- 但此前没有迁移创建过该列，导致保存时报 PGRST204（线上数据结构需要更新）。
alter table public.celebrity_profiles
  add column if not exists report_prompt text;

comment on column public.celebrity_profiles.report_prompt is
  '该明星专属报告提示词；为空时回退到 ideal._reportPrompt';

-- 把历史上嵌在 ideal._reportPrompt 里的提示词回填到独立列，保持两处一致。
update public.celebrity_profiles
set report_prompt = ideal ->> '_reportPrompt'
where report_prompt is null
  and ideal ->> '_reportPrompt' is not null
  and ideal ->> '_reportPrompt' <> '';
