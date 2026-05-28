-- ============================================================================
-- DDFAB dealer intake — Supabase schema
-- ============================================================================
-- Run this once in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run.
--
-- What it sets up:
--   • a `submissions` table holding every form answer
--   • a private `submissions` Storage bucket for logos + gallery photos
--   • Row Level Security so the public form can ONLY insert (never read)
--
-- You (signed into the dashboard) can read and download everything; the public
-- anon key can submit but cannot list or read other people's submissions.
-- ============================================================================

-- ── Submissions table ───────────────────────────────────────────────────────
create table if not exists public.submissions (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  status               text not null default 'new',   -- new | building | done
  folder               text not null,                 -- Storage folder for this submission's files

  -- Company
  company_name         text not null,
  tagline              text,
  about                text,

  -- Contact
  email                text not null,
  phone                text not null,
  street               text,
  city                 text,
  state                text,
  zip                  text,
  hours                text,
  service_area         text,
  facebook             text,
  instagram            text,

  -- Domain
  has_domain           boolean default false,
  domain               text,
  domain_has_live_site boolean default false,

  -- Site
  template             text default 'shop-standard',
  services             jsonb default '[]'::jsonb,      -- ["MIG Welding", ...]
  gallery              jsonb default '[]'::jsonb,       -- [{ path, service, alt }]
  logo_path            text                             -- Storage path to the logo
);

-- Newest first when browsing in the dashboard.
create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

-- ── Row Level Security: public can INSERT, nothing else ─────────────────────
alter table public.submissions enable row level security;

drop policy if exists "anon can submit" on public.submissions;
create policy "anon can submit"
  on public.submissions
  for insert
  to anon
  with check (true);

-- ── Storage bucket (private) ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- Allow the public form to upload into the 'submissions' bucket only.
--
-- NOTE: many Supabase projects do NOT let the SQL Editor manage policies on
-- storage.objects (it errors with "must be owner of table objects"), which
-- silently skips the two statements below. If uploads fail with "new row
-- violates row-level security policy", create this policy from the dashboard
-- instead: Storage → Policies → New policy on the `submissions` bucket →
-- operation INSERT, target role `anon`, WITH CHECK: bucket_id = 'submissions'.
drop policy if exists "anon can upload submissions" on storage.objects;
create policy "anon can upload submissions"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'submissions');
