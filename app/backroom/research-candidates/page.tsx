import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClient,
  requireSupabaseWriteKey,
} from "@/lib/supabase/server";
import {
  clipText,
  fragmentsFromText,
  sourceStatus,
  type SourceArtifact,
  type SourceStatus,
} from "@/lib/source-artifacts";
import { searchWebForSourceMaterial } from "@/lib/source-search";

type SearchParams = Promise<{
  message?: string | string[];
  q?: string | string[];
  status?: string | string[];
}>;

const SOURCE_STATUS_OPTIONS: SourceStatus[] = ["draft", "approved", "rejected"];

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function asNumber(value: FormDataEntryValue | null, fallback = 12) {
  const number = Number(value || fallback);

  return Number.isFinite(number) ? Math.max(1, Math.min(24, number)) : fallback;
}

function wordsFromTerms(terms: string) {
  return [
    ...new Set(
      terms
        .split(/[,\s]+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 2)
        .slice(0, 12)
    ),
  ];
}

function messageRedirect(message: string, terms?: string) {
  const params = new URLSearchParams({ message });
  if (terms) params.set("q", terms);

  redirect(`/backroom/research-candidates?${params.toString()}`);
}

function revalidateInterferenceSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/artifact/[slug]", "page");
  revalidatePath("/drift/[slug]", "page");
  revalidatePath("/float");
  revalidatePath("/backroom/research-candidates");
}

export async function searchInterferenceAction(formData: FormData) {
  "use server";

  requireSupabaseWriteKey();
  const terms = String(formData.get("terms") || "").trim();
  const limit = asNumber(formData.get("limit"), 12);

  if (!terms) throw new Error("Enter search terms first.");

  const results = await searchWebForSourceMaterial({
    limit,
    queries: [terms],
  });
  const supabase = await createClient();
  const now = new Date().toISOString();
  const rows = results.map((result) => ({
    ...result,
    source_type: "other",
    related_entity: terms,
    room_tags: [],
    keywords: wordsFromTerms(terms),
    atmosphere_tags: [],
    motif_tags: [],
    status: "draft",
    hidden: true,
    intensity: 3,
    updated_at: now,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("source_artifacts")
      .upsert(rows, { onConflict: "source_url,title" });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/backroom/research-candidates");
  messageRedirect(`${rows.length} search results are waiting for approval.`, terms);
}

export async function approveManualInterferenceAction(formData: FormData) {
  "use server";

  requireSupabaseWriteKey();
  const title =
    String(formData.get("title") || "").trim() || "Manual interference note";
  const text = String(formData.get("text") || "").trim();
  const sourceUrl = String(formData.get("source_url") || "").trim();

  if (!text) throw new Error("Enter text before approving it.");

  const fragments = fragmentsFromText(text);
  const now = new Date().toISOString();
  const { error } = await (await createClient()).from("source_artifacts").insert({
    title: clipText(title, 180),
    source_type: "other",
    related_entity: "global interference",
    source_url:
      sourceUrl ||
      `manual://elsewhere/interference/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}-${now}`,
    source_name: sourceUrl ? null : "manual entry",
    short_excerpt: clipText(text, 240),
    paraphrased_summary: "A manually approved fragment for global interference.",
    keywords: [],
    atmosphere_tags: [],
    motif_tags: [],
    room_tags: [],
    extracted_fragments:
      fragments.length > 0 ? fragments.slice(0, 8) : [clipText(text, 110)],
    status: "approved",
    hidden: true,
    intensity: 4,
    updated_at: now,
  });

  if (error) throw new Error(error.message);

  revalidateInterferenceSurfaces();
  messageRedirect("Manual text approved and added to global interference.");
}

export async function setSourceStatusAction(formData: FormData) {
  "use server";

  requireSupabaseWriteKey();
  const id = String(formData.get("id") || "");
  const status = sourceStatus(formData.get("status"));

  if (!id) throw new Error("Missing source id.");

  const { error } = await (await createClient())
    .from("source_artifacts")
    .update({ status, hidden: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidateInterferenceSurfaces();
  messageRedirect(
    status === "approved"
      ? "Approved. This text can now surface as global interference."
      : `Marked ${status}.`
  );
}

function Notice({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="mb-8 border border-emerald-950 bg-emerald-950/20 px-5 py-4 text-sm text-emerald-300">
      {message}
    </p>
  );
}

function SourceResultCard({ source }: { source: SourceArtifact }) {
  const fragments = source.extracted_fragments || [];

  return (
    <article className="grid gap-4 border border-stone-800 bg-stone-950/50 p-5 md:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="border border-stone-800 px-2 py-1 text-[9px] uppercase tracking-[0.22em] text-stone-500">
            {source.status}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-600">
            {source.source_name || source.source_type}
          </span>
        </div>
        <h2 className="mt-3 font-serif text-2xl text-stone-100">
          {source.title}
        </h2>
        {(source.short_excerpt || source.paraphrased_summary) && (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400">
            {source.short_excerpt || source.paraphrased_summary}
          </p>
        )}
        {fragments.length > 0 && (
          <div className="mt-4 grid gap-1 border-l border-stone-800 pl-4">
            {fragments.slice(0, 3).map((fragment) => (
              <p
                key={fragment}
                className="font-serif text-sm italic leading-6 text-stone-500"
              >
                {fragment}
              </p>
            ))}
          </div>
        )}
        <a
          href={source.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block break-all text-xs text-stone-600 underline decoration-stone-800 underline-offset-4 hover:text-stone-300"
        >
          {source.source_url}
        </a>
      </div>
      <div className="flex flex-row gap-2 md:flex-col">
        <form action={setSourceStatusAction}>
          <input type="hidden" name="id" value={source.id} />
          <input type="hidden" name="status" value="approved" />
          <button className="border border-stone-500 bg-stone-200 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-stone-950 hover:bg-white">
            Approve
          </button>
        </form>
        {source.status !== "rejected" && (
          <form action={setSourceStatusAction}>
            <input type="hidden" name="id" value={source.id} />
            <input type="hidden" name="status" value="rejected" />
            <button className="border border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-stone-600 hover:border-stone-600 hover:text-stone-300">
              Reject
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

export default async function SourceMaterialsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const message = one(params.message);
  const query = one(params.q) || "";
  const selectedStatus = sourceStatus(one(params.status) || "draft");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_artifacts")
    .select("*")
    .eq("status", selectedStatus)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error?.code === "42P01") {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-16 text-stone-200">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/backroom"
            className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
          >
            ← Backroom
          </Link>
          <section className="mt-12 border border-amber-900/60 bg-amber-950/10 p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-500">
              Source system unavailable
            </p>
            <h1 className="mt-4 font-serif text-4xl text-stone-100">
              The source_artifacts table is not installed yet.
            </h1>
            <p className="mt-5 leading-7 text-stone-400">
              Apply the latest Supabase migration, then return here to approve
              hidden interference text.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (error) throw new Error(error.message);

  const sources = (data || []) as SourceArtifact[];

  return (
    <main className="min-h-screen bg-[#0c0b0a] px-6 py-16 text-stone-200">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/backroom"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Backroom
        </Link>
        <header className="mb-10 mt-12">
          <p className="text-xs uppercase tracking-[0.42em] text-stone-600">
            Global interference
          </p>
          <h1 className="mt-4 font-serif text-5xl text-stone-100 md:text-7xl">
            Find a trace. Approve it.
          </h1>
          <p className="mt-6 max-w-2xl leading-7 text-stone-400">
            Search for source material or paste text by hand. Approved text
            becomes hidden interference that can surface on artifact, Drift, and
            Float pages.
          </p>
        </header>

        <Notice message={message} />

        <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <form
            action={searchInterferenceAction}
            className="space-y-5 border border-stone-800 bg-stone-950/60 p-5"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
              Search
            </p>
            <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
              Search terms
              <input
                name="terms"
                required
                defaultValue={query}
                placeholder="Halou interview Wiser review"
                className="mt-2 w-full border-b border-stone-800 bg-transparent py-3 normal-case tracking-normal text-stone-100 outline-none focus:border-stone-400"
              />
            </label>
            <label className="block max-w-32 text-xs uppercase tracking-[0.22em] text-stone-500">
              Results
              <input
                name="limit"
                type="number"
                min={1}
                max={24}
                defaultValue={12}
                className="mt-2 w-full border-b border-stone-800 bg-transparent py-3 normal-case tracking-normal text-stone-100 outline-none focus:border-stone-400"
              />
            </label>
            <button className="border border-stone-700 px-5 py-3 text-xs uppercase tracking-[0.22em] text-stone-300 hover:border-stone-300">
              Search for interference
            </button>
          </form>

          <form
            action={approveManualInterferenceAction}
            className="space-y-5 border border-stone-800 bg-stone-950/60 p-5"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
              Manual text
            </p>
            <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
              Label
              <input
                name="title"
                placeholder="Recovered note"
                className="mt-2 w-full border-b border-stone-800 bg-transparent py-3 normal-case tracking-normal text-stone-100 outline-none focus:border-stone-400"
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
              Text
              <textarea
                name="text"
                required
                rows={6}
                placeholder="Paste the fragment here."
                className="mt-2 w-full border border-stone-800 bg-transparent px-3 py-3 normal-case tracking-normal text-stone-200 outline-none focus:border-stone-400"
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
              Source URL, optional
              <input
                name="source_url"
                placeholder="https://..."
                className="mt-2 w-full border-b border-stone-800 bg-transparent py-3 normal-case tracking-normal text-stone-100 outline-none focus:border-stone-400"
              />
            </label>
            <button className="border border-stone-700 px-5 py-3 text-xs uppercase tracking-[0.22em] text-stone-300 hover:border-stone-300">
              Approve manual text
            </button>
          </form>
        </section>

        <nav className="my-10 flex flex-wrap gap-2">
          {SOURCE_STATUS_OPTIONS.map((status) => (
            <Link
              key={status}
              href={`/backroom/research-candidates?status=${status}${
                query ? `&q=${encodeURIComponent(query)}` : ""
              }`}
              className={`border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${
                selectedStatus === status
                  ? "border-stone-300 text-stone-100"
                  : "border-stone-800 text-stone-500 hover:border-stone-500"
              }`}
            >
              {status}
            </Link>
          ))}
        </nav>

        {sources.length > 0 ? (
          <section className="grid gap-5">
            {sources.map((source) => (
              <SourceResultCard key={source.id} source={source} />
            ))}
          </section>
        ) : (
          <section className="border border-dashed border-stone-800 bg-stone-950/40 p-10 text-center">
            <p className="text-stone-500">
              No {selectedStatus} interference records are in this view.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
