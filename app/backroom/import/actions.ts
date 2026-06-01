"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCoverArtUrl,
  getMusicBrainzArtistName,
  getMusicBrainzRelease,
  getMusicBrainzTracks,
  type MusicBrainzRelease,
} from "@/lib/musicbrainz";
import { getOfficialHalouLyrics } from "@/lib/halou-lyrics";
import { createClient } from "@/lib/supabase/server";

type ArtifactType = "Band" | "Album" | "Song" | "Artwork";

type ImportedArtifact = {
  id: string;
  slug: string;
  image_url: string | null;
  audio_url: string | null;
  private_notes: string | null;
};

type LocalSongMetadata = {
  index: number;
  title: string;
  artist: string;
  album: string;
  year: string;
  trackNumber: number;
};

type LocalLyricsMetadata = {
  songId: string;
  lyrics: string;
};

type ReviewedOnlineLyricsMetadata = LocalLyricsMetadata & {
  sourceUrl: string;
};

type ArchiveMaterialMetadata = {
  index: number;
  title: string;
  artifactType: "Artwork" | "Photo" | "Design" | "Demo" | "Video";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTitle(value: string) {
  return slugify(value.replace(/[’‘]/g, "'")).replace(/^(the)-/, "");
}

function sourceNote(source: string, current?: string | null) {
  const existing = current?.trim();

  if (!existing) return source;
  if (existing.includes(source)) return existing;

  return `${existing}\n\n${source}`;
}

function splitTags(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function mergeTags(current: string[] | null, additions: string[]) {
  const tags = [...(current || [])];
  const normalized = new Set(tags.map((tag) => tag.toLowerCase()));

  for (const tag of additions) {
    const key = tag.toLowerCase();

    if (normalized.has(key)) continue;

    tags.push(tag);
    normalized.add(key);
  }

  return tags;
}

async function createUniqueSlug(baseSlug: string) {
  const supabase = await createClient();
  let slug = baseSlug || "untitled";
  let counter = 2;

  while (true) {
    const { data } = await supabase
      .from("artifacts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function findArtifact(
  title: string,
  artifactType: ArtifactType,
  parentId: string | null
) {
  const supabase = await createClient();
  let query = supabase
    .from("artifacts")
    .select("id, slug, image_url, audio_url, private_notes")
    .eq("title", title)
    .eq("artifact_type", artifactType);

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data } = await query.limit(1).maybeSingle();

  if (data) return data as ImportedArtifact;

  let legacyQuery = supabase
    .from("artifacts")
    .select("id, slug, image_url, audio_url, private_notes")
    .eq("title", title)
    .eq("kind", artifactType);

  legacyQuery = parentId
    ? legacyQuery.eq("parent_id", parentId)
    : legacyQuery.is("parent_id", null);

  const { data: legacyData } = await legacyQuery.limit(1).maybeSingle();
  return (legacyData as ImportedArtifact | null) || null;
}

async function ensureArtifact({
  title,
  artifactType,
  parent,
  bandId,
  albumId,
  sortOrder = 0,
  year = "",
  album = "",
  imageUrl = "",
  audioUrl = "",
  note,
}: {
  title: string;
  artifactType: ArtifactType;
  parent?: ImportedArtifact | null;
  bandId?: string | null;
  albumId?: string | null;
  sortOrder?: number;
  year?: string;
  album?: string;
  imageUrl?: string;
  audioUrl?: string;
  note: string;
}) {
  const supabase = await createClient();
  const existing = await findArtifact(title, artifactType, parent?.id || null);

  const sharedFields = {
    artifact_type: artifactType,
    kind: artifactType,
    parent_id: parent?.id || null,
    parent_slug: parent?.slug || "",
    band_id: bandId || null,
    album_id: albumId || null,
    sort_order: sortOrder,
    year,
    album,
  };

  if (existing) {
    const { error } = await supabase
      .from("artifacts")
      .update({
        ...sharedFields,
        image_url: existing.image_url || imageUrl,
        audio_url: existing.audio_url || audioUrl,
        private_notes: sourceNote(note, existing.private_notes),
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);

    return {
      ...existing,
      image_url: existing.image_url || imageUrl,
      audio_url: existing.audio_url || audioUrl,
      private_notes: sourceNote(note, existing.private_notes),
    };
  }

  const slug = await createUniqueSlug(slugify(title));
  const { data, error } = await supabase
    .from("artifacts")
    .insert({
      title,
      slug,
      ...sharedFields,
      image_url: imageUrl,
      audio_url: audioUrl,
      private_notes: note,
      atmosphere: [],
      motifs: [],
      rooms: [],
      nearby: [],
      is_public: false,
    })
    .select("id, slug, image_url, audio_url, private_notes")
    .single();

  if (error) throw new Error(error.message);

  return data as ImportedArtifact;
}

async function importMusicBrainzRelease(
  release: MusicBrainzRelease,
  selectedTrackIds?: Set<string>,
  includeCover = true
) {
  const artistName = getMusicBrainzArtistName(release) || "Unknown artist";
  const year = release.date?.slice(0, 4) || "";
  const source = `Imported from MusicBrainz release: https://musicbrainz.org/release/${release.id}`;
  const coverArtUrl =
    includeCover && release["cover-art-archive"]?.front
      ? getCoverArtUrl(release.id)
      : "";

  const band = await ensureArtifact({
    title: artistName,
    artifactType: "Band",
    note: source,
  });

  const album = await ensureArtifact({
    title: release.title,
    artifactType: "Album",
    parent: band,
    bandId: band.id,
    year,
    imageUrl: coverArtUrl,
    note: source,
  });

  const tracks = getMusicBrainzTracks(release).filter(
    (track) => !selectedTrackIds || selectedTrackIds.has(track.id)
  );

  for (const track of tracks) {
    await ensureArtifact({
      title: track.recording.title || track.title,
      artifactType: "Song",
      parent: album,
      bandId: band.id,
      albumId: album.id,
      sortOrder: track.position,
      year,
      album: release.title,
      note: source,
    });
  }

  if (coverArtUrl) {
    await ensureArtifact({
      title: `${release.title} cover artwork`,
      artifactType: "Artwork",
      parent: album,
      bandId: band.id,
      albumId: album.id,
      imageUrl: coverArtUrl,
      note: source,
    });
  }
}

function finishImport(message: string) {
  revalidatePath("/backroom");
  redirect(`/backroom/import?imported=${encodeURIComponent(message)}`);
}

export async function importMusicBrainzReleaseAction(formData: FormData) {
  const releaseId = String(formData.get("release_id") || "");
  const selectedTrackIds = new Set(
    formData.getAll("track_ids").map((value) => String(value))
  );

  if (!releaseId) throw new Error("Choose a MusicBrainz release first.");
  if (selectedTrackIds.size === 0) throw new Error("Choose at least one track.");

  const release = await getMusicBrainzRelease(releaseId);
  await importMusicBrainzRelease(
    release,
    selectedTrackIds,
    formData.get("include_cover") === "yes"
  );

  finishImport(`${release.title} and ${selectedTrackIds.size} songs imported as drafts.`);
}

export async function importMusicBrainzCatalogAction(formData: FormData) {
  const releaseIds = formData.getAll("release_ids").map((value) => String(value));
  const includeCover = formData.get("include_cover") === "yes";

  if (releaseIds.length === 0) throw new Error("Choose at least one release.");

  for (let index = 0; index < releaseIds.length; index++) {
    const release = await getMusicBrainzRelease(releaseIds[index]);
    await importMusicBrainzRelease(release, undefined, includeCover);

    if (index < releaseIds.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  finishImport(`${releaseIds.length} releases imported as drafts.`);
}

async function uploadArtifactFile({
  file,
  folder,
  slug,
}: {
  file: File;
  folder: "images" | "audio" | "video";
  slug: string;
}) {
  if (!file || file.size === 0) return "";

  const supabase = await createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() || "file";
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const path = `${slug}/${folder}/${uniqueId}.${extension}`;

  const { error } = await supabase.storage
    .from("artifact-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("artifact-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function importArchiveMaterialsAction(formData: FormData) {
  const supabase = await createClient();
  const files = formData
    .getAll("archive_files")
    .filter((file): file is File => file instanceof File && file.size > 0);
  const metadata = JSON.parse(
    String(formData.get("metadata") || "[]")
  ) as ArchiveMaterialMetadata[];
  const parentId = String(formData.get("parent_id") || "").trim();
  const note = String(formData.get("private_notes") || "").trim();

  if (!parentId) throw new Error("Choose a parent artifact.");
  if (metadata.length === 0) throw new Error("Choose at least one archive file.");

  const { data: parent, error: parentError } = await supabase
    .from("artifacts")
    .select("id, slug, artifact_type, kind, band_id, album_id, song_id")
    .eq("id", parentId)
    .single();

  if (parentError) throw new Error(parentError.message);

  const parentType = parent.artifact_type || parent.kind;
  const bandId = parentType === "Band" ? parent.id : parent.band_id;
  const albumId = parentType === "Album" ? parent.id : parent.album_id;
  const songId = parentType === "Song" ? parent.id : parent.song_id;

  for (const item of metadata) {
    const file = files[item.index];

    if (!file || !item.title.trim()) continue;

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isAudio && !isVideo) continue;

    const slug = await createUniqueSlug(slugify(item.title));
    const mediaUrl = await uploadArtifactFile({
      file,
      folder: isImage ? "images" : isAudio ? "audio" : "video",
      slug,
    });

    const { error } = await supabase.from("artifacts").insert({
      title: item.title.trim(),
      slug,
      artifact_type: item.artifactType,
      kind: item.artifactType,
      parent_id: parent.id,
      parent_slug: parent.slug,
      band_id: bandId || null,
      album_id: albumId || null,
      song_id: songId || null,
      image_url: isImage ? mediaUrl : "",
      audio_url: isAudio ? mediaUrl : "",
      video_url: isVideo ? mediaUrl : "",
      atmosphere: [],
      motifs: [],
      rooms: [],
      nearby: [],
      private_notes:
        note || `Imported from local archive file: ${file.name}`,
      is_public: false,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(
    `/backroom/import?imported=${encodeURIComponent(
      `${metadata.length} archive materials imported as linked drafts.`
    )}`
  );
}

export async function importLocalAudioAction(formData: FormData) {
  const files = formData
    .getAll("audio_files")
    .filter((file): file is File => file instanceof File && file.size > 0);
  const metadata = JSON.parse(
    String(formData.get("metadata") || "[]")
  ) as LocalSongMetadata[];
  const selected = metadata.filter((song) => files[song.index]);

  if (selected.length === 0) throw new Error("Choose at least one audio file.");

  const fallbackArtist = String(formData.get("artist") || "Halou").trim();
  const fallbackAlbum = String(formData.get("album") || "Loose recordings").trim();
  const fallbackYear = String(formData.get("year") || "").trim();
  const sharedCover = formData.get("shared_cover");
  const coverFile =
    sharedCover instanceof File && sharedCover.size > 0 ? sharedCover : null;
  const albumCache = new Map<string, ImportedArtifact>();
  const bandCache = new Map<string, ImportedArtifact>();

  for (const song of selected) {
    const artistName = song.artist || fallbackArtist;
    const albumTitle = song.album || fallbackAlbum;
    const year = song.year || fallbackYear;
    const note = `Imported from local audio file: ${files[song.index].name}`;

    let band = bandCache.get(artistName);
    if (!band) {
      band = await ensureArtifact({
        title: artistName,
        artifactType: "Band",
        note,
      });
      bandCache.set(artistName, band);
    }

    const albumKey = `${band.id}:${albumTitle}`;
    let album = albumCache.get(albumKey);

    if (!album) {
      const albumSlug = slugify(albumTitle);
      const imageUrl = coverFile
        ? await uploadArtifactFile({
            file: coverFile,
            folder: "images",
            slug: albumSlug,
          })
        : "";

      album = await ensureArtifact({
        title: albumTitle,
        artifactType: "Album",
        parent: band,
        bandId: band.id,
        year,
        imageUrl,
        note,
      });
      albumCache.set(albumKey, album);
    }

    const songSlug = slugify(song.title);
    const audioUrl = await uploadArtifactFile({
      file: files[song.index],
      folder: "audio",
      slug: songSlug,
    });

    await ensureArtifact({
      title: song.title,
      artifactType: "Song",
      parent: album,
      bandId: band.id,
      albumId: album.id,
      sortOrder: song.trackNumber,
      year,
      album: albumTitle,
      audioUrl,
      note,
    });
  }

  finishImport(`${selected.length} local audio files imported as drafts.`);
}

export async function importLocalLyricsAction(formData: FormData) {
  const supabase = await createClient();
  const metadata = JSON.parse(
    String(formData.get("metadata") || "[]")
  ) as LocalLyricsMetadata[];
  const selected = metadata.filter(
    (item) => item.songId && item.lyrics.trim().length > 0
  );

  if (selected.length === 0) {
    throw new Error("Choose at least one matched lyrics file.");
  }

  for (const item of selected) {
    const { error } = await supabase
      .from("artifacts")
      .update({ lyrics: item.lyrics.trim() })
      .eq("id", item.songId)
      .or("artifact_type.eq.Song,kind.eq.Song");

    if (error) throw new Error(error.message);
  }

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(
    `/backroom/import?imported=${encodeURIComponent(
      `${selected.length} lyrics files added to song artifacts.`
    )}`
  );
}

export async function importOfficialHalouLyricsAction(formData: FormData) {
  const supabase = await createClient();
  const selectedSongIds = new Set(
    formData.getAll("song_ids").map((value) => String(value))
  );

  if (selectedSongIds.size === 0) {
    throw new Error("Choose at least one matched song.");
  }

  const { data: songs, error } = await supabase
    .from("artifacts")
    .select("id, title, private_notes")
    .or("artifact_type.eq.Song,kind.eq.Song");

  if (error) throw new Error(error.message);

  const officialLyrics = await getOfficialHalouLyrics();
  const lyricsByTitle = new Map(
    officialLyrics.map((entry) => [normalizeTitle(entry.title), entry])
  );
  let importedCount = 0;

  for (const song of songs || []) {
    if (!selectedSongIds.has(song.id)) continue;

    const entry = lyricsByTitle.get(normalizeTitle(song.title));

    if (!entry) continue;

    const note = `Lyrics imported from official Halou site: ${entry.sourceUrl}`;
    const { error: updateError } = await supabase
      .from("artifacts")
      .update({
        lyrics: entry.lyrics,
        private_notes: sourceNote(note, song.private_notes),
      })
      .eq("id", song.id);

    if (updateError) throw new Error(updateError.message);

    importedCount += 1;
  }

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(
    `/backroom/import?imported=${encodeURIComponent(
      `${importedCount} official Halou lyric records imported.`
    )}&lyrics=official`
  );
}

export async function importReviewedOnlineLyricsAction(formData: FormData) {
  if (formData.get("rights_confirmed") !== "yes") {
    throw new Error("Confirm that you have permission to use these lyrics.");
  }

  const supabase = await createClient();
  const metadata = JSON.parse(
    String(formData.get("metadata") || "[]")
  ) as ReviewedOnlineLyricsMetadata[];
  const selected = metadata.filter(
    (item) => item.songId && item.lyrics.trim().length > 0
  );

  if (selected.length === 0) {
    throw new Error("Add at least one reviewed lyrics entry.");
  }

  for (const item of selected) {
    const { data: song, error: songError } = await supabase
      .from("artifacts")
      .select("private_notes")
      .eq("id", item.songId)
      .or("artifact_type.eq.Song,kind.eq.Song")
      .single();

    if (songError) throw new Error(songError.message);

    const sourceUrl = item.sourceUrl.trim();
    const note = sourceUrl
      ? `Lyrics reviewed from online source: ${sourceUrl}`
      : "Lyrics pasted manually in the Backroom.";
    const { error } = await supabase
      .from("artifacts")
      .update({
        lyrics: item.lyrics.trim(),
        private_notes: sourceNote(note, song.private_notes),
      })
      .eq("id", item.songId);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(
    `/backroom/import?imported=${encodeURIComponent(
      `${selected.length} reviewed online lyric records added.`
    )}`
  );
}

export async function importReviewedAtmosphereAction(formData: FormData) {
  const supabase = await createClient();
  const songIds = [
    ...new Set(formData.getAll("song_ids").map((value) => String(value))),
  ];

  if (songIds.length === 0) {
    throw new Error("Choose at least one mood suggestion.");
  }

  for (const songId of songIds) {
    const tags = formData
      .getAll(`atmosphere_${songId}`)
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (tags.length === 0) continue;

    const { data: song, error: songError } = await supabase
      .from("artifacts")
      .select("atmosphere, private_notes")
      .eq("id", songId)
      .or("artifact_type.eq.Song,kind.eq.Song")
      .single();

    if (songError) throw new Error(songError.message);

    const atmosphere = [
      ...new Set([...(song.atmosphere || []), ...tags]),
    ];
    const note = "Atmosphere suggestions imported from AcousticBrainz.";
    const { error } = await supabase
      .from("artifacts")
      .update({
        atmosphere,
        private_notes: sourceNote(note, song.private_notes),
      })
      .eq("id", songId);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(
    `/backroom/import?imported=${encodeURIComponent(
      `${songIds.length} atmosphere records updated.`
    )}`
  );
}

export async function addBulkSongTagsAction(formData: FormData) {
  const supabase = await createClient();
  const songIds = [
    ...new Set(formData.getAll("song_ids").map((value) => String(value))),
  ];
  const field = String(formData.get("tag_field") || "");
  const tags = [...new Set(splitTags(formData.get("tags")))];

  if (field !== "atmosphere" && field !== "motifs") {
    throw new Error("Choose a valid tag field.");
  }

  if (songIds.length === 0) {
    throw new Error("Choose at least one song.");
  }

  if (tags.length === 0) {
    throw new Error("Add at least one tag.");
  }

  const { data: songs, error: songsError } = await supabase
    .from("artifacts")
    .select(`id, ${field}`)
    .in("id", songIds)
    .or("artifact_type.eq.Song,kind.eq.Song");

  if (songsError) throw new Error(songsError.message);

  for (const song of songs || []) {
    const currentTags = (song as Record<string, unknown>)[field] as
      | string[]
      | null;
    const { error } = await supabase
      .from("artifacts")
      .update({
        [field]: mergeTags(currentTags || [], tags),
      })
      .eq("id", song.id);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(
    `/backroom/import?imported=${encodeURIComponent(
      `${tags.length} ${field} tag${tags.length === 1 ? "" : "s"} added to ${
        (songs || []).length
      } songs.`
    )}`
  );
}

export async function addBulkArtifactTagsAction(formData: FormData) {
  const supabase = await createClient();
  const artifactIds = [
    ...new Set(formData.getAll("artifact_ids").map((value) => String(value))),
  ];
  const field = String(formData.get("tag_field") || "");
  const tags = [...new Set(splitTags(formData.get("tags")))];

  if (!["atmosphere", "motifs", "rooms"].includes(field)) {
    throw new Error("Choose a valid tag field.");
  }

  if (artifactIds.length === 0) throw new Error("Choose at least one artifact.");
  if (tags.length === 0) throw new Error("Add at least one tag.");

  const { data: artifacts, error: artifactsError } = await supabase
    .from("artifacts")
    .select("*")
    .in("id", artifactIds);

  if (artifactsError) throw new Error(artifactsError.message);

  for (const artifact of artifacts || []) {
    const currentTags = (artifact as Record<string, unknown>)[field] as
      | string[]
      | null;
    const { error } = await supabase
      .from("artifacts")
      .update({ [field]: mergeTags(currentTags || [], tags) })
      .eq("id", artifact.id);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(
    `/backroom/import?imported=${encodeURIComponent(
      `${tags.length} ${field} tag${tags.length === 1 ? "" : "s"} added to ${
        (artifacts || []).length
      } artifacts.`
    )}`
  );
}

export async function importReviewedCoverArtAction(formData: FormData) {
  const supabase = await createClient();
  const albumIds = [
    ...new Set(formData.getAll("album_ids").map((value) => String(value))),
  ];
  const copyToSongs = formData.get("copy_to_songs") === "yes";

  if (albumIds.length === 0) {
    throw new Error("Choose at least one cover-art suggestion.");
  }

  let updatedAlbums = 0;
  let updatedSongs = 0;

  for (const albumId of albumIds) {
    const imageUrl = String(formData.get(`image_url_${albumId}`) || "").trim();
    const releaseId = String(formData.get(`release_id_${albumId}`) || "").trim();

    if (!imageUrl) continue;

    const { data: album, error: albumError } = await supabase
      .from("artifacts")
      .select("private_notes")
      .eq("id", albumId)
      .or("artifact_type.eq.Album,kind.eq.Album")
      .single();

    if (albumError) throw new Error(albumError.message);

    const note = `Cover art imported from Cover Art Archive release: https://musicbrainz.org/release/${releaseId}`;
    const { error } = await supabase
      .from("artifacts")
      .update({
        image_url: imageUrl,
        private_notes: sourceNote(note, album.private_notes),
      })
      .eq("id", albumId);

    if (error) throw new Error(error.message);

    updatedAlbums += 1;

    if (copyToSongs) {
      const { data: songs, error: songsError } = await supabase
        .from("artifacts")
        .select("id")
        .eq("album_id", albumId)
        .or("artifact_type.eq.Song,kind.eq.Song")
        .or("image_url.is.null,image_url.eq.");

      if (songsError) throw new Error(songsError.message);

      if ((songs || []).length > 0) {
        const { error: updateSongsError } = await supabase
          .from("artifacts")
          .update({ image_url: imageUrl })
          .in(
            "id",
            (songs || []).map((song) => song.id)
          );

        if (updateSongsError) throw new Error(updateSongsError.message);

        updatedSongs += (songs || []).length;
      }
    }
  }

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(
    `/backroom/import?imported=${encodeURIComponent(
      `${updatedAlbums} album covers and ${updatedSongs} song images updated.`
    )}`
  );
}
