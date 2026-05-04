-- 002_seed_categories.sql
-- Seed categories (idempotent). Run after 001_initial-migration.sql.
--
-- UUIDs match a typical Supabase seed; if Alcohol/Lipsticks IDs differ in your DB,
-- adjust or rely on ON CONFLICT (slug) for re-runs.

insert into public.categories (id, name, slug, created_at)
values
  (
    '14bb3cdc-1a44-4f77-b29d-4844ef42b1f0'::uuid,
    'Accessories',
    'accessories',
    timestamptz '2026-05-04 01:23:40.591091+00'
  ),
  (
    '3f48f043-6b19-4248-9b25-a54e2c7f894c'::uuid,
    'Makeup',
    'makeup',
    timestamptz '2026-05-04 01:23:40.591091+00'
  ),
  (
    '60408f55-223e-49bd-8091-53109c49c952'::uuid,
    'Alcohol',
    'alcohol',
    timestamptz '2026-05-04 01:23:40.591091+00'
  ),
  (
    '7836ec3d-58ad-4f0b-b962-be7edcc5a881'::uuid,
    'Lipsticks',
    'lipsticks',
    timestamptz '2026-05-04 01:23:40.591091+00'
  )
on conflict (slug) do nothing;
