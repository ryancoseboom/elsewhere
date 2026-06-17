export default function BackroomLoading() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-stone-200">
      <div className="mx-auto max-w-6xl">
        <div className="h-3 w-32 bg-stone-800" />
        <div className="mt-12 h-16 max-w-xl bg-stone-900" />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 border border-stone-800 bg-stone-950/60"
            />
          ))}
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="h-96 border border-stone-800 bg-stone-950/60" />
          <div className="h-96 border border-stone-800 bg-stone-950/60" />
        </div>
      </div>
    </main>
  );
}
