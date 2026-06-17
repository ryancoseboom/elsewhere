export default function DriftArtifactLoading() {
  return (
    <main className="min-h-screen bg-[#090807] px-6 py-8 text-stone-200">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <div className="flex justify-between">
          <div className="h-3 w-28 bg-stone-800" />
          <div className="h-8 w-36 border border-stone-800 bg-black/40" />
        </div>
        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_28rem]">
          <div>
            <div className="h-3 w-44 bg-stone-800" />
            <div className="mt-6 h-28 max-w-3xl bg-stone-900" />
          </div>
          <div className="h-96 border border-stone-800 bg-stone-950/70" />
        </div>
      </div>
    </main>
  );
}
