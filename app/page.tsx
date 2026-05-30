import Link from "next/link";
import { rooms } from "@/data/rooms";
import { artifacts } from "@/data/artifacts";

export default function Home() {
  const driftArtifact = artifacts[0];

  return (
    <main className="min-h-screen bg-black text-zinc-200 flex items-center justify-center px-8">
      <div className="max-w-2xl text-center space-y-14">
        <section className="space-y-6">
          <p className="text-xs uppercase tracking-[0.5em] text-zinc-700">
            Halou
          </p>

          <h1 className="text-5xl md:text-7xl tracking-[0.28em]">
            ELSEWHERE
          </h1>

          <p className="text-zinc-500 text-lg">
            Some rooms are still lit.
          </p>
        </section>

        <nav className="flex flex-col gap-5 pt-6">
          {rooms.map((room) => (
            <Link
              key={room.slug}
              href={`/room/${room.slug}`}
              className="text-zinc-400 hover:text-zinc-100 transition"
            >
              Enter {room.title}
            </Link>
          ))}

          <Link
            href={`/artifact/${driftArtifact.slug}`}
            className="pt-8 text-zinc-600 hover:text-zinc-300 transition"
          >
            Drift
          </Link>
          <Link href="/traces">Traces</Link>
        </nav>
        <Link
  href="/backroom"
  className="fixed bottom-6 right-6 text-[10px] uppercase tracking-[0.35em] text-stone-700 hover:text-stone-400 transition"
>
  Backroom
</Link>
      </div>
    </main>
  );
}