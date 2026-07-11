import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AUDIO_MIGRATION_STATUSES,
  audioMigrationStatus,
  audioMigrationStatusLabel,
  deriveSupabaseStorageReference,
  filenameFromUrl,
  fileExtensionFromUrl,
  normalizeDropboxAudioUrl,
} from "@/lib/audio-migration";
import { createClient, requireSupabaseWriteKey } from "@/lib/supabase/server";
import { AudioMigrationControls } from "./AudioMigrationControls";

type SearchParams = Promise<{
  album?: string | string[];
  error?: string | string[];
  q?: string | string[];
  saved?: string | string[];
  song?: string | string[];
  status?: string | string[];
  type?: string | string[];
}>;

type AudioArtifact = {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  parent_id: string | null;
  band_id: string | null;
  album_id: string | null;
  song_id: string | null;
  kind: string | null;
  artifact_type: string | null;
  audio_url: string | null;
  audio_original_url: string | null;
  audio_source_type: string | null;
  audio_migration_status: string | null;
  audio_migration_updated_at: string | null;
  album: string | null;
  year: string | number | null;
  sort_order: number | null;
};

type ArtifactContext = {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  parent_id: string | null;
  album_id: string | null;
  song_id: string | null;
  kind: string | null;
  artifact_type: string | null;
  album: string | null;
  sort_order: number | null;
};

type StorageMeta = {
  size: number | null;
  mimeType: string | null;
  updatedAt: string | null;
  error?: string;
};

type AudioRow = AudioArtifact & {
  albumLabel: string;
  currentUrl: string;
  extension: string;
  filename: string;
  originalUrl: string;
  songLabel: string;
  status: string;
  storageMeta: StorageMeta | null;
  storagePath: string;
  typeLabel: string;
};

const AUDIO_SELECT =
  "id, slug, title, parent_slug, parent_id, band_id, album_id, song_id, kind, artifact_type, audio_url, audio_original_url, audio_source_type, audio_migration_status, audio_migration_updated_at, album, year, sort_order";

const CONTEXT_SELECT =
  "id, slug, title, parent_slug, parent_id, album_id, song_id, kind, artifact_type, album, sort_order";

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || "";
}

function artifactType(artifact: Pick<AudioArtifact, "artifact_type" | "kind">) {
  return artifact.artifact_type || artifact.kind || "Audio";
}

function isColumnError(error: { code?: string; message?: string }) {
  const message = error.message || "";
  return error.code === "42703" || message.includes("audio_original_url");
}

function humanBytes(value?: number | null) {
  if (!value) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function sourceTypeFromUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();

    if (
      host === "dropbox.com" ||
      host.endsWith(".dropbox.com") ||
      host === "dropboxusercontent.com" ||
      host.endsWith(".dropboxusercontent.com")
    ) {
      return "dropbox";
    }
  } catch {
    return "external";
  }

  return "external";
}

function findContext(
  artifact: AudioArtifact,
  contexts: Map<string, ArtifactContext>,
  wantedType: "Album" | "Song"
) {
  const directId = wantedType === "Album" ? artifact.album_id : artifact.song_id;
  if (directId && contexts.has(directId)) return contexts.get(directId) || null;

  const parent = artifact.parent_id ? contexts.get(artifact.parent_id) : null;
  if (parent && artifactType(parent) === wantedType) return parent;

  const grandparent = parent?.parent_id ? contexts.get(parent.parent_id) : null;
  if (grandparent && artifactType(grandparent) === wantedType) {
    return grandparent;
  }

  return null;
}

async function loadStorageMetadata(
  supabase: Awaited<ReturnType<typeof createClient>>,
  artifacts: AudioArtifact[]
) {
  const references = new Map<string, { bucket: string; path: string }>();

  for (const artifact of artifacts) {
    const reference = deriveSupabaseStorageReference(
      artifact.audio_original_url || artifact.audio_url || ""
    );

    if (reference) references.set(`${reference.bucket}:${reference.path}`, reference);
  }

  const results = new Map<string, StorageMeta>();

  await Promise.all(
    Array.from(references.entries()).map(async ([key, reference]) => {
      const pathParts = reference.path.split("/");
      const fileName = pathParts.pop() || "";
      const folder = pathParts.join("/");

      try {
        const { data, error } = await supabase.storage
          .from(reference.bucket)
          .list(folder, { limit: 100, search: fileName });

        if (error) {
          results.set(key, {
            error: error.message,
            mimeType: null,
            size: null,
            updatedAt: null,
          });
          return;
        }

        const item = data?.find((candidate) => candidate.name === fileName);
        const metadata = item?.metadata as
          | { mimeType?: string; mimetype?: string; size?: number }
          | undefined;

        results.set(key, {
          mimeType: metadata?.mimetype || metadata?.mimeType || null,
          size: metadata?.size || null,
          updatedAt: item?.updated_at || item?.created_at || null,
        });
      } catch (error) {
        results.set(key, {
          error: error instanceof Error ? error.message : "Storage lookup failed",
          mimeType: null,
          size: null,
          updatedAt: null,
        });
      }
    })
  );

  return results;
}

function buildAudioRows(
  artifacts: AudioArtifact[],
  contexts: ArtifactContext[],
  storageMetadata: Map<string, StorageMeta>
) {
  const contextById = new Map(contexts.map((artifact) => [artifact.id, artifact]));

  return artifacts.map((artifact) => {
    const album = findContext(artifact, contextById, "Album");
    const song = findContext(artifact, contextById, "Song");
    const url = artifact.audio_url || "";
    const originalUrl = artifact.audio_original_url || "";
    const reference = deriveSupabaseStorageReference(originalUrl || url);
    const storageKey = reference ? `${reference.bucket}:${reference.path}` : "";

    return {
      ...artifact,
      albumLabel: album?.title || artifact.album || "Unfiled album",
      currentUrl: url,
      extension: fileExtensionFromUrl(originalUrl || url),
      filename: filenameFromUrl(originalUrl || url) || `${artifact.slug}.audio`,
      originalUrl,
      songLabel: song?.title || "Loose audio",
      status: audioMigrationStatus(artifact.audio_migration_status),
      storageMeta: storageKey ? storageMetadata.get(storageKey) || null : null,
      storagePath: reference ? `${reference.bucket}/${reference.path}` : "",
      typeLabel: artifactType(artifact),
    };
  });
}

function filterRows(
  rows: AudioRow[],
  filters: {
    album: string;
    q: string;
    song: string;
    status: string;
    type: string;
  }
) {
  const search = filters.q.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.album && row.albumLabel !== filters.album) return false;
    if (filters.song && row.songLabel !== filters.song) return false;
    if (filters.type && row.typeLabel !== filters.type) return false;
    if (filters.status && row.status !== filters.status) return false;

    if (!search) return true;

    const haystack = [
      row.albumLabel,
      row.currentUrl,
      row.filename,
      row.originalUrl,
      row.slug,
      row.songLabel,
      row.storagePath,
      row.title,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

function redirectWithMessage(kind: "error" | "saved", message: string): never {
  redirect(
    `/backroom/audio-migration?${new URLSearchParams({
      [kind]: message,
    }).toString()}`
  );
}

export async function saveDropboxUrlAction(formData: FormData) {
  "use server";

  requireSupabaseWriteKey();
  const supabase = await createClient();
  const id = String(formData.get("artifact_id") || "");
  const normalizedUrl = normalizeDropboxAudioUrl(
    String(formData.get("dropbox_url") || "")
  );

  if (!id || !normalizedUrl) {
    redirectWithMessage("error", "Missing artifact or replacement URL.");
  }

  const { data: artifact, error: readError } = await supabase
    .from("artifacts")
    .select("id, title, audio_url, audio_original_url")
    .eq("id", id)
    .single();

  if (readError || !artifact?.audio_url) {
    redirectWithMessage("error", "Could not read the current audio URL.");
  }

  const { error } = await supabase
    .from("artifacts")
    .update({
      audio_migration_status: "dropbox_added",
      audio_migration_updated_at: new Date().toISOString(),
      audio_original_url: artifact.audio_original_url || artifact.audio_url,
      audio_source_type: sourceTypeFromUrl(normalizedUrl),
      audio_url: normalizedUrl,
    })
    .eq("id", id);

  if (error) redirectWithMessage("error", error.message);

  revalidatePath("/backroom/audio-migration");
  redirectWithMessage("saved", `Saved Dropbox audio for ${artifact.title}.`);
}

export async function markAudioMigrationStatusAction(formData: FormData) {
  "use server";

  requireSupabaseWriteKey();
  const supabase = await createClient();
  const id = String(formData.get("artifact_id") || "");
  const status = audioMigrationStatus(String(formData.get("status") || ""));

  if (!id || !["verified", "ready_to_delete"].includes(status)) {
    redirectWithMessage("error", "Choose a valid migration status.");
  }

  const { error } = await supabase
    .from("artifacts")
    .update({
      audio_migration_status: status,
      audio_migration_updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirectWithMessage("error", error.message);

  revalidatePath("/backroom/audio-migration");
  redirectWithMessage("saved", `Marked audio ${audioMigrationStatusLabel(status)}.`);
}

export async function revertAudioToSupabaseAction(formData: FormData) {
  "use server";

  requireSupabaseWriteKey();
  const supabase = await createClient();
  const id = String(formData.get("artifact_id") || "");

  const { data: artifact, error: readError } = await supabase
    .from("artifacts")
    .select("id, title, audio_original_url")
    .eq("id", id)
    .single();

  if (readError || !artifact?.audio_original_url) {
    redirectWithMessage("error", "No preserved Supabase URL was found.");
  }

  const { error } = await supabase
    .from("artifacts")
    .update({
      audio_migration_status: "not_started",
      audio_migration_updated_at: new Date().toISOString(),
      audio_source_type: "supabase",
      audio_url: artifact.audio_original_url,
    })
    .eq("id", id);

  if (error) redirectWithMessage("error", error.message);

  revalidatePath("/backroom/audio-migration");
  redirectWithMessage("saved", `Restored Supabase audio for ${artifact.title}.`);
}

export default async function AudioMigrationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = {
    album: one(params.album),
    q: one(params.q),
    song: one(params.song),
    status: one(params.status),
    type: one(params.type),
  };
  const savedMessage = one(params.saved);
  const errorMessage = one(params.error);
  const supabase = await createClient();

  const [audioResult, contextResult] = await Promise.all([
    supabase
      .from("artifacts")
      .select(AUDIO_SELECT)
      .not("audio_url", "is", null)
      .neq("audio_url", "")
      .order("album", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true }),
    supabase.from("artifacts").select(CONTEXT_SELECT),
  ]);

  if (audioResult.error) {
    if (isColumnError(audioResult.error)) {
      return <MigrationNeeded />;
    }

    throw new Error(audioResult.error.message);
  }

  if (contextResult.error) throw new Error(contextResult.error.message);

  const audioArtifacts = (audioResult.data || []) as AudioArtifact[];
  const storageMetadata = await loadStorageMetadata(supabase, audioArtifacts);
  const rows = buildAudioRows(
    audioArtifacts,
    (contextResult.data || []) as ArtifactContext[],
    storageMetadata
  );
  const filteredRows = filterRows(rows, filters);
  const albumOptions = Array.from(new Set(rows.map((row) => row.albumLabel))).sort();
  const songOptions = Array.from(new Set(rows.map((row) => row.songLabel))).sort();
  const typeOptions = Array.from(new Set(rows.map((row) => row.typeLabel))).sort();
  const totalBytes = rows.reduce(
    (sum, row) => sum + (row.storageMeta?.size || 0),
    0
  );
  const statusCounts = AUDIO_MIGRATION_STATUSES.map((status) => ({
    count: rows.filter((row) => row.status === status).length,
    status,
  }));

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-8 text-stone-200">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-stone-800 pb-8">
          <Link
            href="/backroom"
            className="text-xs uppercase tracking-[0.24em] text-stone-500 transition hover:text-stone-200"
          >
            Backroom
          </Link>
          <h1 className="mt-4 text-4xl text-stone-100">Audio migration</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400">
            Inventory every playable Supabase audio file, test Dropbox
            replacements, preserve the original URL, and mark files when they
            are verified or ready to delete.
          </p>
        </header>

        {savedMessage && (
          <Notice tone="saved" message={savedMessage} />
        )}

        {errorMessage && (
          <Notice tone="error" message={errorMessage} />
        )}

        <section className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="Audio files" value={rows.length} />
          <SummaryCard label="Visible now" value={filteredRows.length} />
          <SummaryCard label="Known storage" value={humanBytes(totalBytes)} />
          {statusCounts.map(({ status, count }) => (
            <SummaryCard
              key={status}
              label={audioMigrationStatusLabel(status)}
              value={count}
            />
          ))}
        </section>

        <section className="mb-8 border border-stone-800 bg-stone-950/60 p-5">
          <form className="grid gap-3 lg:grid-cols-[1fr_repeat(4,minmax(0,180px))_auto]">
            <input
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Search artifact, slug, filename..."
              className="min-h-11 border border-stone-800 bg-neutral-950 px-3 text-sm text-stone-200 outline-none placeholder:text-stone-700 focus:border-stone-500"
            />
            <SelectFilter
              label="All albums"
              name="album"
              options={albumOptions}
              value={filters.album}
            />
            <SelectFilter
              label="All songs"
              name="song"
              options={songOptions}
              value={filters.song}
            />
            <SelectFilter
              label="All types"
              name="type"
              options={typeOptions}
              value={filters.type}
            />
            <SelectFilter
              label="All statuses"
              name="status"
              options={[...AUDIO_MIGRATION_STATUSES]}
              renderOption={audioMigrationStatusLabel}
              value={filters.status}
            />
            <button
              type="submit"
              className="min-h-11 border border-stone-700 px-4 text-[10px] uppercase tracking-[0.22em] text-stone-300 transition hover:border-stone-300 hover:text-stone-100"
            >
              Filter
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {filteredRows.map((row) => (
            <AudioMigrationRow key={row.id} row={row} />
          ))}
        </section>

        {filteredRows.length === 0 && (
          <section className="border border-stone-800 bg-stone-950/50 p-8 text-center text-sm text-stone-500">
            No audio files match those filters.
          </section>
        )}
      </div>
    </main>
  );
}

function MigrationNeeded() {
  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-10 text-stone-200">
      <div className="mx-auto max-w-4xl border border-amber-900 bg-amber-950/20 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-amber-400">
          Migration needed
        </p>
        <h1 className="mt-4 text-3xl text-stone-100">
          Audio migration fields are not available yet.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-400">
          Run the audio migration first, then return here to inventory Supabase
          files and save Dropbox replacements.
        </p>
        <Link
          href="/backroom"
          className="mt-6 inline-flex border border-stone-700 px-4 py-3 text-xs uppercase tracking-[0.22em] text-stone-300"
        >
          Back to backroom
        </Link>
      </div>
    </main>
  );
}

function AudioMigrationRow({ row }: { row: AudioRow }) {
  return (
    <article className="border border-stone-800 bg-stone-950/50 p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em]">
            <Tag>{row.albumLabel}</Tag>
            <Tag>{row.songLabel}</Tag>
            <Tag>{row.typeLabel}</Tag>
            <span className="border border-stone-700 px-2 py-1 text-stone-300">
              {audioMigrationStatusLabel(row.status)}
            </span>
          </div>

          <h2 className="text-2xl text-stone-100">{row.title}</h2>
          <p className="mt-1 text-sm text-stone-500">{row.slug}</p>

          <dl className="mt-5 grid gap-3 text-sm leading-6 sm:grid-cols-2">
            <Meta label="Filename" value={row.filename} />
            <Meta label="Format" value={row.extension || "Unknown"} />
            <Meta
              label="Storage"
              value={row.storagePath || "External or unrecognized URL"}
            />
            <Meta label="Size" value={humanBytes(row.storageMeta?.size)} />
            <Meta label="MIME" value={row.storageMeta?.mimeType || "Unknown"} />
            <Meta
              label="Updated"
              value={
                row.audio_migration_updated_at
                  ? new Date(row.audio_migration_updated_at).toLocaleString()
                  : "Not migrated"
              }
            />
          </dl>

          {row.storageMeta?.error && (
            <p className="mt-4 text-xs leading-5 text-amber-400">
              Storage lookup note: {row.storageMeta.error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/backroom/artifacts/${row.slug}/edit`}
              className="border border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-400 transition hover:border-stone-500 hover:text-stone-100"
            >
              Edit artifact
            </Link>
            <a
              href={row.currentUrl}
              target="_blank"
              rel="noreferrer"
              className="border border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-400 transition hover:border-stone-500 hover:text-stone-100"
            >
              Open current
            </a>
            {row.originalUrl && row.originalUrl !== row.currentUrl && (
              <a
                href={row.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="border border-stone-900 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-500 transition hover:border-stone-600 hover:text-stone-300"
              >
                Open original
              </a>
            )}
          </div>
        </div>

        <div className="space-y-4 border border-stone-900 bg-neutral-950 p-4">
          <audio
            controls
            preload="none"
            src={row.currentUrl}
            className="h-10 w-full"
          />

          <form action={saveDropboxUrlAction} className="space-y-3">
            <input type="hidden" name="artifact_id" value={row.id} />
            <AudioMigrationControls
              currentUrl={row.currentUrl}
              defaultReplacementUrl={
                row.audio_source_type === "dropbox" ? row.currentUrl : ""
              }
              inputId={`dropbox-url-${row.id}`}
            />
            <button
              type="submit"
              className="w-full border border-stone-600 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-stone-200 transition hover:border-stone-200 hover:text-white"
            >
              Save Dropbox URL
            </button>
          </form>

          <div className="grid gap-2 sm:grid-cols-3">
            <StatusForm id={row.id} label="Verified" status="verified" />
            <StatusForm
              id={row.id}
              label="Ready to delete"
              status="ready_to_delete"
            />
            <form action={revertAudioToSupabaseAction}>
              <input type="hidden" name="artifact_id" value={row.id} />
              <button
                type="submit"
                disabled={!row.originalUrl}
                className="min-h-11 w-full border border-stone-900 px-3 text-[10px] uppercase tracking-[0.18em] text-stone-500 transition hover:border-stone-600 hover:text-stone-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Revert
              </button>
            </form>
          </div>
        </div>
      </div>
    </article>
  );
}

function Notice({
  message,
  tone,
}: {
  message: string;
  tone: "error" | "saved";
}) {
  const classes =
    tone === "saved"
      ? "border-emerald-900 bg-emerald-950/20 text-emerald-300"
      : "border-red-900 bg-red-950/20 text-red-300";

  return (
    <section className={`mb-6 border px-5 py-4 text-sm leading-6 ${classes}`}>
      {message}
    </section>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border border-stone-800 bg-stone-950/60 p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
        {label}
      </p>
      <p className="mt-3 text-2xl text-stone-100">{value}</p>
    </div>
  );
}

function SelectFilter({
  label,
  name,
  options,
  renderOption = (option) => option,
  value,
}: {
  label: string;
  name: string;
  options: string[];
  renderOption?: (option: string) => string;
  value: string;
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="min-h-11 border border-stone-800 bg-neutral-950 px-3 text-sm text-stone-300 outline-none focus:border-stone-500"
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {renderOption(option)}
        </option>
      ))}
    </select>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-stone-600">
        {label}
      </dt>
      <dd className="mt-1 break-all text-stone-300">{value}</dd>
    </div>
  );
}

function StatusForm({
  id,
  label,
  status,
}: {
  id: string;
  label: string;
  status: "ready_to_delete" | "verified";
}) {
  return (
    <form action={markAudioMigrationStatusAction}>
      <input type="hidden" name="artifact_id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="min-h-11 w-full border border-stone-800 px-3 text-[10px] uppercase tracking-[0.18em] text-stone-400 transition hover:border-stone-500 hover:text-stone-100"
      >
        {label}
      </button>
    </form>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="border border-stone-800 px-2 py-1 text-stone-500">
      {children}
    </span>
  );
}
