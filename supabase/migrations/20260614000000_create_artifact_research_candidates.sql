create extension if not exists pgcrypto;

create table if not exists public.artifact_research_candidates (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'needs_review'
    check (
      status in (
        'needs_review',
        'approved_created',
        'approved_updated',
        'rejected',
        'needs_research'
      )
    ),
  title text not null,
  source_url text not null,
  estimated_date text,
  research_type text,
  suggested_artifact_type text,
  suggested_title text,
  suggested_description text,
  suggested_motifs text[] not null default '{}'::text[],
  suggested_rooms text[] not null default '{}'::text[],
  related_artifacts text[] not null default '{}'::text[],
  confidence integer,
  why_it_matters text,
  suggested_parent_slug text,
  suggested_existing_slug text,
  created_artifact_id uuid references public.artifacts(id) on delete set null,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_url, title)
);

alter table public.artifact_research_candidates enable row level security;

drop policy if exists "No public artifact research candidate access"
on public.artifact_research_candidates;

create policy "No public artifact research candidate access"
on public.artifact_research_candidates
for all
to anon, authenticated
using (false)
with check (false);

