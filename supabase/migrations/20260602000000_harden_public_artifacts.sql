-- Keep existing attached media visible when its parent artifact is published.
update public.artifacts as child
set is_public = true
from public.artifacts as parent
where child.parent_id = parent.id
  and parent.is_public = true
  and coalesce(child.is_public, false) = false
  and (
    coalesce(child.artifact_type, child.kind, '') in (
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
  );

alter table public.artifacts enable row level security;

drop policy if exists "Public can read published artifacts" on public.artifacts;

create policy "Public can read published artifacts"
on public.artifacts
for select
to anon, authenticated
using (is_public = true);
