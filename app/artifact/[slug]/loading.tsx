export default function ArtifactLoading() {
  return (
    <main className="min-h-screen bg-[#11100e] px-5 py-8 text-stone-200">
      <div className="mx-auto max-w-7xl">
        <div className="h-3 w-36 bg-stone-800/80" />
        <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
          <div className="h-96 border border-stone-800 bg-stone-950/70" />
          <div>
            <div className="h-3 w-44 bg-stone-800/80" />
            <div className="mt-5 h-24 max-w-3xl bg-stone-900/80" />
            <div className="mt-8 h-40 max-w-2xl border border-stone-800 bg-stone-950/60" />
          </div>
        </div>
      </div>
    </main>
  );
}
