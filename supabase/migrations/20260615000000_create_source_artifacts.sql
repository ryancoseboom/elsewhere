create extension if not exists pgcrypto;

create table if not exists public.source_artifacts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null default 'other'
    check (
      source_type in (
        'article',
        'review',
        'interview',
        'lyric',
        'listing',
        'archive',
        'press',
        'video_description',
        'other'
      )
    ),
  related_entity text,
  related_artifact_slug text,
  room_tags text[] not null default '{}'::text[],
  source_url text not null,
  source_name text,
  author text,
  publication_date text,
  captured_at timestamptz not null default now(),
  short_excerpt text,
  paraphrased_summary text,
  keywords text[] not null default '{}'::text[],
  atmosphere_tags text[] not null default '{}'::text[],
  motif_tags text[] not null default '{}'::text[],
  extracted_fragments text[] not null default '{}'::text[],
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected')),
  hidden boolean not null default true,
  intensity integer not null default 3
    check (intensity >= 1 and intensity <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_url, title)
);

alter table public.source_artifacts enable row level security;

drop policy if exists "No public source artifact access"
on public.source_artifacts;

create policy "No public source artifact access"
on public.source_artifacts
for all
to anon, authenticated
using (false)
with check (false);

