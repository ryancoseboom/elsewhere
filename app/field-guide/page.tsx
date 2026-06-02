import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const specimens = [
  { code: "OBJ-017", title: "RED CRYSTAL HEART" },
  { code: "OBJ-011", title: "THE BEAR" },
  { code: "LOC-004", title: "THE WOODS" },
  { code: "REC-032", title: "COCO" },
];

function TextureLayers() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.42] mix-blend-screen"
        style={{
          backgroundImage: "url('/textures/float/photocopy-noise.jpg')",
          backgroundSize: "420px 420px",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.32] mix-blend-screen"
        style={{
          backgroundImage: "url('/textures/float/dust-scratches.jpg')",
          backgroundSize: "cover",
        }}
      />

      <div
        className="pointer-events-none absolute left-[-6%] top-[14%] z-0 h-[38%] w-[42%] rotate-[-4deg] opacity-[0.22] mix-blend-screen"
        style={{
          backgroundImage: "url('/textures/float/fingerprint-smudge.jpg')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div
        className="pointer-events-none absolute right-[-4%] top-[52%] z-0 h-[34%] w-[36%] rotate-[9deg] opacity-[0.18] mix-blend-screen"
        style={{
          backgroundImage: "url('/textures/float/fingerprint-smudge.jpg')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(0,0,0,.82)_100%)]" />
    </>
  );
}

function XeroxBlock({
  className = "",
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 text-black grayscale contrast-200 ${className}`}
    >
      <div
        className="pointer-events-none absolute -top-3 left-5 z-20 h-7 w-20 rotate-[-7deg] opacity-[0.45] mix-blend-multiply"
        style={{
          backgroundImage: "url('/textures/float/masking-tape.jpg')",
          backgroundSize: "cover",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,black_0_10%,transparent_11%),repeating-linear-gradient(90deg,black_0_2px,transparent_2px_7px)] opacity-70" />

      <div className="absolute inset-0 mix-blend-multiply opacity-40 [background-image:radial-gradient(circle,black_0_1px,transparent_1px)] [background-size:5px_5px]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28] mix-blend-multiply"
        style={{
          backgroundImage: "url('/textures/float/photocopy-noise.jpg')",
          backgroundSize: "260px 260px",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage: "url('/textures/float/dust-scratches.jpg')",
          backgroundSize: "cover",
        }}
      />

      {label && (
        <div className="absolute bottom-2 left-2 bg-black px-2 py-1 text-[9px] uppercase tracking-[0.25em] text-white">
          {label}
        </div>
      )}
    </div>
  );
}

function SpecimenStrip() {
  return (
    <div className="grid grid-cols-2 gap-px bg-white/80 p-px">
      {specimens.map((item) => (
        <div key={item.code} className="bg-black p-3">
          <div className="mb-2 text-[9px] uppercase tracking-[0.25em] text-zinc-500">
            {item.code}
          </div>
          <div className="text-xs font-black uppercase leading-tight tracking-[0.08em] text-zinc-100">
            {item.title}
          </div>
        </div>
      ))}
    </div>
  );
}

function TextColumn({ fragments }: { fragments: string[] }) {
  return (
    <div className="columns-2 gap-6 text-[11px] font-bold leading-5 text-zinc-100">
      {fragments.slice(0, 8).map((fragment) => (
        <p key={fragment} className="mb-4">
          {fragment}
        </p>
      ))}
    </div>
  );
}

export default function Page() {
  const displayFragments = [
  "Every night I hear the signal",
  "Something hidden in the trees",
  "I carried the heart home",
  "The room remembers differently",
  "The bear waited patiently",
  "The woods were already watching",
  "A visitor arrived without warning",
  "Everything returned altered",
];
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <TextureLayers />

      <div className="relative mx-auto min-h-screen max-w-7xl overflow-hidden px-6 py-8">
        <div className="absolute left-6 top-6 z-20 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">
          Field Plate 032
        </div>

        <div className="absolute right-8 top-6 z-20 rotate-3 border border-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white">
          Incomplete
        </div>

        <div className="grid min-h-[900px] grid-cols-[.9fr_1.45fr_.9fr] gap-4">
          <aside className="relative z-10 pt-16">
            <XeroxBlock className="h-52" label="Fig. A" />

            <div className="mt-4 grid grid-cols-[.7fr_1fr] gap-3">
              <XeroxBlock className="h-36" label="OBJ" />

              <div className="relative bg-white p-3 text-black">
                <div className="text-[42px] font-black leading-none">?</div>
                <div className="mt-3 text-[10px] font-black uppercase leading-4 tracking-[0.18em]">
                  {displayFragments.slice(0, 3).map((fragment) => (
                    <div key={fragment}>{fragment.slice(0, 22)}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rotate-[-1deg] border-y border-white/70 py-3 text-[11px] font-black uppercase leading-5 tracking-[0.25em]">
              {displayFragments[0]}
              <br />
              {displayFragments[1]}
            </div>

            <div className="mt-4">
              <SpecimenStrip />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-px bg-white p-px">
              {["◉", "△", "□", "Ⅳ", "×", "17"].map((mark) => (
                <div
                  key={mark}
                  className="grid h-16 place-items-center bg-black text-xl font-black"
                >
                  {mark}
                </div>
              ))}
            </div>
          </aside>

          <section className="relative z-10 flex items-center justify-center">
            <div className="absolute inset-y-8 left-1/2 w-[72%] -translate-x-1/2 bg-zinc-100 text-black shadow-[0_0_80px_rgba(255,255,255,.08)]">
              <div
                className="pointer-events-none absolute -inset-[10px] z-20 opacity-[0.35] mix-blend-multiply"
                style={{
                  backgroundImage: "url('/textures/float/torn-paper-edge.jpg')",
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                }}
              />

              <div
                className="pointer-events-none absolute inset-0 z-10 opacity-[0.22] mix-blend-multiply"
                style={{
                  backgroundImage: "url('/textures/float/photocopy-noise.jpg')",
                  backgroundSize: "380px 380px",
                }}
              />

              <div
                className="pointer-events-none absolute inset-0 z-10 opacity-[0.18] mix-blend-multiply"
                style={{
                  backgroundImage: "url('/textures/float/dust-scratches.jpg')",
                  backgroundSize: "cover",
                }}
              />

              <div className="absolute inset-0 opacity-35 mix-blend-multiply [background-image:repeating-linear-gradient(0deg,black_0_1px,transparent_1px_5px)]" />

              <div
                className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 select-none text-[22rem] font-black leading-[.78] tracking-[-0.12em] text-black"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                }}
              >
                COCO
              </div>

              <div className="absolute left-[38%] top-[43%] z-30 h-44 w-44 rounded-full border-[28px] border-black" />

              <div className="absolute bottom-[18%] left-[43%] z-30 h-32 w-20 bg-black [clip-path:polygon(50%_0,100%_55%,62%_100%,38%_100%,0_55%)]" />

              <div className="absolute left-8 top-8 z-30 text-[11px] font-black uppercase tracking-[0.25em]">
                Manifestation / Recording
              </div>

              <div className="absolute bottom-8 right-8 z-30 rotate-[-8deg] border border-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.25em]">
                observed 4 times
              </div>
            </div>
          </section>

          <aside className="relative z-10 pt-14">
            <div
              className="mb-4 text-[34px] font-black uppercase leading-[.85] tracking-[-0.05em]"
              style={{ writingMode: "vertical-rl" }}
            >
              {displayFragments.slice(2, 6).join(" ")}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <XeroxBlock className="h-32" label="LOC" />
              <XeroxBlock className="h-32" label="REC" />
            </div>

            <div className="mt-4 bg-white p-4 text-black">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.25em]">
                known fragments
              </div>

              <div className="space-y-1">
                {displayFragments.slice(0, 8).map((fragment) => (
                  <div
                    key={fragment}
                    className="text-[15px] font-black uppercase leading-none tracking-[-0.03em]"
                  >
                    {fragment}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rotate-1 border border-white/80 p-4">
              <TextColumn fragments={displayFragments} />
            </div>

            <div className="mt-4 grid grid-cols-[1fr_.55fr] gap-3">
              <div className="bg-white p-3 text-black">
                <div className="text-[9px] font-black uppercase tracking-[0.25em]">
                  Missing caption
                </div>
                <div className="mt-3 text-[26px] font-black uppercase leading-none">
                  {displayFragments[0]?.slice(0, 18)}
                  <br />
                  {displayFragments[1]?.slice(0, 18)}
                </div>
              </div>

              <XeroxBlock className="h-28" label="B7" />
            </div>
          </aside>
        </div>

        <div className="absolute bottom-5 left-0 right-0 z-20 flex justify-center text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
          coco / field plate / recovered issue
        </div>
      </div>
    </main>
  );
}
