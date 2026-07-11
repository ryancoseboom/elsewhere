export const AUDIO_MIGRATION_STATUSES = [
  "not_started",
  "dropbox_added",
  "verified",
  "ready_to_delete",
];

export const AUDIO_MIGRATION_STATUS_LABELS = {
  not_started: "Not Started",
  dropbox_added: "Dropbox Added",
  verified: "Verified",
  ready_to_delete: "Ready to Delete",
};

export function audioMigrationStatus(value) {
  return AUDIO_MIGRATION_STATUSES.includes(value) ? value : "not_started";
}

export function audioMigrationStatusLabel(value) {
  return AUDIO_MIGRATION_STATUS_LABELS[audioMigrationStatus(value)];
}

export function normalizeDropboxAudioUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) return "";

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const host = url.hostname.toLowerCase();
  const isDropbox =
    host === "dropbox.com" ||
    host.endsWith(".dropbox.com") ||
    host === "dropboxusercontent.com" ||
    host.endsWith(".dropboxusercontent.com");

  if (!isDropbox) return trimmed;

  url.searchParams.delete("dl");
  url.searchParams.delete("raw");
  url.searchParams.set("raw", "1");

  return url.toString();
}

export function fileExtensionFromUrl(value) {
  try {
    const url = new URL(value);
    const fileName = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    return fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() || "" : "";
  } catch {
    const clean = String(value || "").split("?")[0];
    return clean.includes(".") ? clean.split(".").pop()?.toLowerCase() || "" : "";
  }
}

export function filenameFromUrl(value) {
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
  } catch {
    return String(value || "").split("?")[0].split("/").filter(Boolean).pop() || "";
  }
}

export function deriveSupabaseStorageReference(value) {
  const markers = [
    "/storage/v1/object/public/",
    "/storage/v1/object/sign/",
  ];

  try {
    const url = new URL(value);
    const marker = markers.find((candidate) => url.pathname.includes(candidate));

    if (!marker) return null;

    const markerIndex = url.pathname.indexOf(marker);

    const reference = url.pathname.slice(markerIndex + marker.length);
    const [bucket, ...pathParts] = reference.split("/").filter(Boolean);
    const path = decodeURIComponent(pathParts.join("/"));

    if (!bucket || !path) return null;

    return { bucket, path };
  } catch {
    return null;
  }
}

export function audioPlaybackUrl(artifact) {
  return String(artifact?.audio_url || "").trim();
}
