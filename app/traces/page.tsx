import TraceWall from "./components/TraceWall";

export default function TracesPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-zinc-200">
      <section className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.45em] text-zinc-500">
              Elsewhere Archive
            </p>
            <h1 className="font-serif text-4xl tracking-tight text-zinc-100">
              Traces
            </h1>
          </div>

          <p className="max-w-sm text-sm leading-6 text-zinc-500">
            Recovered fragments. Damaged signals. Evidence from rooms that may
            not exist.
          </p>
        </header>

        <TraceWall />
      </section>
    </main>
  );
}