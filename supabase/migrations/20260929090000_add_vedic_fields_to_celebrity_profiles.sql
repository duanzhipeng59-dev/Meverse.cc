-- Add Vedic astrology birth data and chart cache to celebrity_profiles.
-- Null values keep the legacy BaZi three-pillar flow active for that celebrity.

alter table public.celebrity_profiles
  add column if not exists birth_time text,
  add column if not exists birth_place text,
  add column if not exists birth_lat double precision,
  add column if not exists birth_lon double precision,
  add column if not exists birth_tz text,
  add column if not exists vedic_chart jsonb;

alter table public.celebrity_profiles
  add constraint birth_time_format check (
    birth_time is null or birth_time ~ '^[0-9]{2}:[0-9]{2}$'
  );
