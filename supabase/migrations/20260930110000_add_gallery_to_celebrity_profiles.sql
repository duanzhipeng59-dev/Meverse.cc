-- Multiple photos per celebrity for the detail-page gallery strip.
-- Manual curation: set gallery = '["url1","url2",...]'::jsonb per row.

alter table public.celebrity_profiles
  add column if not exists gallery jsonb not null default '[]'::jsonb;
