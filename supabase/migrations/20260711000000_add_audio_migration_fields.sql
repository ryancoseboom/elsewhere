alter table public.artifacts
  add column if not exists audio_original_url text,
  add column if not exists audio_source_type text not null default 'supabase',
  add column if not exists audio_migration_status text not null default 'not_started',
  add column if not exists audio_migration_updated_at timestamptz;

alter table public.artifacts
  drop constraint if exists artifacts_audio_source_type_check;

alter table public.artifacts
  add constraint artifacts_audio_source_type_check
  check (audio_source_type in ('supabase', 'dropbox', 'external'));

alter table public.artifacts
  drop constraint if exists artifacts_audio_migration_status_check;

alter table public.artifacts
  add constraint artifacts_audio_migration_status_check
  check (
    audio_migration_status in (
      'not_started',
      'dropbox_added',
      'verified',
      'ready_to_delete'
    )
  );
