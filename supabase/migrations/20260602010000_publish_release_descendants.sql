-- Repair published releases after row-level visitor filtering was enabled.
-- Album and single pages need their tracks, and tracks need their attached media.
with recursive publication_descendants as (
  select child.id, child.slug, child.artifact_type, child.kind
  from public.artifacts as parent
  join public.artifacts as child
    on child.parent_id = parent.id
    or child.parent_slug = parent.slug
    or (
      coalesce(parent.artifact_type, parent.kind, '') in ('Album', 'Single')
      and child.album_id = parent.id
    )
    or (
      coalesce(parent.artifact_type, parent.kind, '') = 'Song'
      and child.song_id = parent.id
    )
  where parent.is_public = true
    and (
      (
        coalesce(parent.artifact_type, parent.kind, '') in ('Album', 'Single')
        and coalesce(child.artifact_type, child.kind, '') = 'Song'
      )
      or coalesce(child.artifact_type, child.kind, '') in (
        'Artwork',
        'Design',
        'Photo',
        'Demo',
        'Video'
      )
      or nullif(child.image_url, '') is not null
      or nullif(child.audio_url, '') is not null
      or nullif(child.video_url, '') is not null
      or nullif(child.youtube_url, '') is not null
    )

  union

  select child.id, child.slug, child.artifact_type, child.kind
  from publication_descendants as parent
  join public.artifacts as child
    on child.parent_id = parent.id
    or child.parent_slug = parent.slug
    or (
      coalesce(parent.artifact_type, parent.kind, '') in ('Album', 'Single')
      and child.album_id = parent.id
    )
    or (
      coalesce(parent.artifact_type, parent.kind, '') = 'Song'
      and child.song_id = parent.id
    )
  where (
    (
      coalesce(parent.artifact_type, parent.kind, '') in ('Album', 'Single')
      and coalesce(child.artifact_type, child.kind, '') = 'Song'
    )
    or coalesce(child.artifact_type, child.kind, '') in (
      'Artwork',
      'Design',
      'Photo',
      'Demo',
      'Video'
    )
    or nullif(child.image_url, '') is not null
    or nullif(child.audio_url, '') is not null
    or nullif(child.video_url, '') is not null
    or nullif(child.youtube_url, '') is not null
  )
)
update public.artifacts
set is_public = true
where id in (select id from publication_descendants)
  and coalesce(is_public, false) = false;
