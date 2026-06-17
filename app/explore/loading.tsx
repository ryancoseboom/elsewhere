export default function ExploreLoading() {
  return (
    <main className="min-h-screen bg-[#090807] px-5 py-8 text-stone-200">
      <div className="mx-auto max-w-[100rem]">
        <div className="h-3 w-36 bg-stone-800" />
        <div className="mt-16 h-24 max-w-xl bg-stone-900" />
        <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-80 border border-stone-800 bg-stone-950/60"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
