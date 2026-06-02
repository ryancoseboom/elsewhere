-- Collapse legacy one-song release wrappers into standalone singles.
create temporary table legacy_single_map (
  wrapper_slug text primary key,
  child_slug text not null unique
) on commit drop;

insert into legacy_single_map (wrapper_slug, child_slug)
values
  ('assassination', 'assassination-2'),
  ('the-diver', 'the-diver-2');

-- Keep the canonical wrapper URL while copying song-level content onto it.
update public.artifacts as wrapper
set artifact_type = 'Single',
    kind = 'Single',
    description = coalesce(nullif(wrapper.description, ''), child.description),
    fragment = coalesce(nullif(wrapper.fragment, ''), child.fragment),
    atmosphere = (
      select coalesce(array_agg(distinct value), '{}'::text[])
      from unnest(coalesce(wrapper.atmosphere, '{}'::text[]) || coalesce(child.atmosphere, '{}'::text[])) as value
    ),
    motifs = (
      select coalesce(array_agg(distinct value), '{}'::text[])
      from unnest(coalesce(wrapper.motifs, '{}'::text[]) || coalesce(child.motifs, '{}'::text[])) as value
    ),
    rooms = (
      select coalesce(array_agg(distinct value), '{}'::text[])
      from unnest(coalesce(wrapper.rooms, '{}'::text[]) || coalesce(child.rooms, '{}'::text[])) as value
    ),
    nearby = (
      select coalesce(array_agg(distinct value), '{}'::text[])
      from unnest(coalesce(wrapper.nearby, '{}'::text[]) || coalesce(child.nearby, '{}'::text[])) as value
    ),
    image_url = coalesce(nullif(wrapper.image_url, ''), child.image_url),
    audio_url = coalesce(nullif(wrapper.audio_url, ''), child.audio_url),
    video_url = coalesce(nullif(wrapper.video_url, ''), child.video_url),
    youtube_url = coalesce(nullif(wrapper.youtube_url, ''), child.youtube_url),
    spotify_url = coalesce(nullif(wrapper.spotify_url, ''), child.spotify_url),
    lyrics = coalesce(nullif(wrapper.lyrics, ''), child.lyrics),
    private_notes = concat_ws(
      E'\n\n',
      nullif(wrapper.private_notes, ''),
      nullif(child.private_notes, '')
    ),
    album = coalesce(nullif(wrapper.album, ''), child.album),
    year = coalesce(nullif(wrapper.year, ''), child.year),
    era = coalesce(nullif(wrapper.era, ''), child.era),
    is_public = coalesce(wrapper.is_public, false) or coalesce(child.is_public, false)
from legacy_single_map as map
join public.artifacts as child on child.slug = map.child_slug
where wrapper.slug = map.wrapper_slug;

-- Point every attached artifact at the surviving standalone single.
update public.artifacts as attached
set parent_id = wrapper.id,
    parent_slug = wrapper.slug,
    album_id = case
      when attached.album_id in (wrapper.id, child.id) then null
      else attached.album_id
    end,
    song_id = case
      when attached.song_id in (wrapper.id, child.id) then null
      else attached.song_id
    end
from legacy_single_map as map
join public.artifacts as wrapper on wrapper.slug = map.wrapper_slug
join public.artifacts as child on child.slug = map.child_slug
where attached.id not in (wrapper.id, child.id)
  and (
    attached.parent_id in (wrapper.id, child.id)
    or attached.parent_slug in (wrapper.slug, child.slug)
    or attached.album_id in (wrapper.id, child.id)
    or attached.song_id in (wrapper.id, child.id)
  );

delete from public.artifacts as child
using legacy_single_map as map
where child.slug = map.child_slug;

-- These releases already have the standalone shape; they only had the wrong type.
update public.artifacts
set artifact_type = 'Single',
    kind = 'Single'
where slug in ('a-visitors-view', 'the-big-whole');

update public.artifacts as attached
set album_id = null,
    song_id = null
from public.artifacts as single
where single.slug in ('a-visitors-view', 'the-big-whole')
  and attached.id <> single.id
  and (
    attached.parent_id = single.id
    or attached.parent_slug = single.slug
    or attached.album_id = single.id
    or attached.song_id = single.id
  );
