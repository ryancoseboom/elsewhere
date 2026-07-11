import assert from "node:assert/strict";
import { test } from "node:test";
import {
  audioPlaybackUrl,
  deriveSupabaseStorageReference,
  filenameFromUrl,
  normalizeDropboxAudioUrl,
} from "../lib/audio-migration.js";

test("normalizes modern Dropbox URLs to raw playback", () => {
  assert.equal(
    normalizeDropboxAudioUrl(
      "https://www.dropbox.com/scl/fi/example/audio.mp3?rlkey=abc123&dl=0"
    ),
    "https://www.dropbox.com/scl/fi/example/audio.mp3?rlkey=abc123&raw=1"
  );
});

test("replaces dl=1 with raw=1", () => {
  assert.equal(
    normalizeDropboxAudioUrl(
      "https://www.dropbox.com/scl/fi/example/audio.mp3?rlkey=abc123&dl=1"
    ),
    "https://www.dropbox.com/scl/fi/example/audio.mp3?rlkey=abc123&raw=1"
  );
});

test("does not duplicate raw query parameters", () => {
  assert.equal(
    normalizeDropboxAudioUrl(
      "https://www.dropbox.com/scl/fi/example/audio.mp3?rlkey=abc123&raw=1"
    ),
    "https://www.dropbox.com/scl/fi/example/audio.mp3?rlkey=abc123&raw=1"
  );
});

test("leaves non-Dropbox external URLs untouched", () => {
  const url = "https://cdn.example.com/audio/demo.mp3?download=1";

  assert.equal(normalizeDropboxAudioUrl(url), url);
});

test("handles Supabase public and signed URLs as playback URLs", () => {
  assert.equal(
    audioPlaybackUrl({
      audio_url:
        "https://project.supabase.co/storage/v1/object/public/artifact-media/demo/audio/file.mp3",
    }),
    "https://project.supabase.co/storage/v1/object/public/artifact-media/demo/audio/file.mp3"
  );
  assert.equal(
    audioPlaybackUrl({
      audio_url:
        "https://project.supabase.co/storage/v1/object/sign/artifact-media/demo/audio/file.mp3?token=abc",
    }),
    "https://project.supabase.co/storage/v1/object/sign/artifact-media/demo/audio/file.mp3?token=abc"
  );
});

test("derives Supabase bucket and path from public URLs", () => {
  assert.deepEqual(
    deriveSupabaseStorageReference(
      "https://project.supabase.co/storage/v1/object/public/artifact-media/demo/audio/file.mp3"
    ),
    {
      bucket: "artifact-media",
      path: "demo/audio/file.mp3",
    }
  );
});

test("derives Supabase bucket and path from signed URLs", () => {
  assert.deepEqual(
    deriveSupabaseStorageReference(
      "https://project.supabase.co/storage/v1/object/sign/artifact-media/demo/audio/file.mp3?token=abc"
    ),
    {
      bucket: "artifact-media",
      path: "demo/audio/file.mp3",
    }
  );
});

test("extracts filenames when metadata is missing", () => {
  assert.equal(
    filenameFromUrl(
      "https://project.supabase.co/storage/v1/object/public/artifact-media/demo/audio/file%20name.mp3"
    ),
    "file name.mp3"
  );
});
