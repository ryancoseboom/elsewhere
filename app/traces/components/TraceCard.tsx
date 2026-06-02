import type { Trace, TraceType } from "./traceData";

function accentClass(accent?: Trace["accent"]) {
  if (accent === "red") return "bg-[#7a1016]";
  if (accent === "gold") return "bg-[#9b814e]";
  if (accent === "green") return "bg-[#566b54]";
  if (accent === "blue") return "bg-[#536879]";
  return "bg-zinc-500";
}

function damageClass(damage?: Trace["damage"]) {
  if (damage === "heavy") {
    return "before:opacity-[0.16] after:opacity-[0.16]";
  }

  if (damage === "medium") {
    return "before:opacity-[0.11] after:opacity-[0.1]";
  }

  return "before:opacity-[0.07] after:opacity-[0.07]";
}

function cardClass(type: TraceType, damage?: Trace["damage"]) {
  const base =
    "group absolute z-10 -translate-x-1/2 -translate-y-1/2 border border-white/10 bg-zinc-950/95 text-zinc-200 shadow-[0_24px_70px_rgba(0,0,0,.62)] transition duration-300 hover:z-20 hover:scale-[1.035] hover:border-white/25 hover:bg-zinc-900/95 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle,white_0_1px,transparent_1px)] before:bg-[length:13px_11px] after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(90deg,white_0_1px,transparent_1px_4px)]";

  const variants: Record<TraceType, string> = {
    album: "w-52 min-h-56 p-4 [clip-path:polygon(1%_0,100%_2%,98%_100%,0_97%)]",
    song: "w-48 min-h-32 p-4 [clip-path:polygon(0_4%,96%_0,100%_92%,5%_100%)]",
    character: "w-44 min-h-52 p-3 [clip-path:polygon(3%_0,100%_0,96%_100%,0_96%)]",
    place: "w-52 min-h-36 p-4 [clip-path:polygon(0_0,97%_5%,100%_100%,3%_94%)]",
    design: "w-48 min-h-48 p-3 [clip-path:polygon(2%_3%,100%_0,94%_100%,0_98%)]",
    lyric: "w-56 min-h-36 p-5 font-serif italic [clip-path:polygon(0_2%,100%_0,97%_96%,4%_100%)]",
    object: "w-44 min-h-44 p-4 [clip-path:polygon(6%_0,100%_3%,95%_100%,0_94%)]",
    journal: "w-56 min-h-48 p-5 font-serif [clip-path:polygon(0_0,100%_4%,96%_100%,3%_96%)]",
  };

  return `${base} ${variants[type]} ${damageClass(damage)}`;
}

function ImagePanel({ trace }: { trace: Trace }) {
  const accentLine = accentClass(trace.accent);

  if (trace.type === "album") {
    return (
      <div className="relative mb-4 aspect-square overflow-hidden border border-white/10 bg-zinc-800 grayscale contrast-125">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.25),transparent_16%),linear-gradient(135deg,rgba(255,255,255,.2),transparent_42%),repeating-linear-gradient(0deg,rgba(255,255,255,.09)_0_1px,transparent_1px_5px)] opacity-80" />
        <div className="absolute left-5 top-5 h-14 w-14 border border-white/25" />
        <div className="absolute bottom-6 right-6 h-16 w-16 rounded-full border border-white/20" />
        <div className={`absolute bottom-4 left-4 h-px w-20 ${accentLine}`} />
      </div>
    );
  }

  if (trace.type === "character") {
    return (
      <div className="relative mb-3 aspect-[4/5] overflow-hidden border border-white/10 bg-zinc-300 grayscale contrast-150">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,0,0,.6),transparent_22%),linear-gradient(to_bottom,transparent,rgba(0,0,0,.88)),repeating-linear-gradient(90deg,rgba(0,0,0,.2)_0_1px,transparent_1px_4px)]" />
        <div className="absolute left-[44%] top-[20%] h-20 w-12 rounded-full bg-black/25 blur-sm" />
        <div className={`absolute bottom-5 left-4 h-8 w-px ${accentLine}`} />
      </div>
    );
  }

  if (trace.type === "place") {
    return (
      <div className="relative mb-3 h-24 overflow-hidden border border-white/10 bg-zinc-900">
        <div className="absolute inset-0 bg-[linear-gradient(30deg,transparent_48%,rgba(255,255,255,.14)_49%,rgba(255,255,255,.14)_50%,transparent_51%),linear-gradient(140deg,transparent_44%,rgba(255,255,255,.1)_45%,rgba(255,255,255,.1)_46%,transparent_47%)]" />
        <div className={`absolute left-8 top-6 h-px w-24 ${accentLine}`} />
        <div className="absolute bottom-4 right-5 text-[9px] tracking-[0.25em] text-white/30">
          MAP
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-3 h-20 overflow-hidden border border-white/10 bg-zinc-900 grayscale contrast-125">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.12)_0_1px,transparent_1px_6px)] opacity-50" />
      <div className={`absolute left-4 top-4 h-px w-16 ${accentLine}`} />
      <div className="absolute bottom-3 right-3 h-5 w-5 border border-white/20" />
    </div>
  );
}

function Tape({ accent }: { accent?: Trace["accent"] }) {
  return (
    <>
      <div
        className="absolute -top-4 left-5 z-20 h-8 w-20 rotate-[-8deg] opacity-55 mix-blend-screen"
        style={{
          backgroundImage: "url('/textures/float/masking-tape.jpg')",
          backgroundSize: "cover",
        }}
      />

      <div
        className="absolute -right-5 top-10 z-20 h-7 w-16 rotate-12 opacity-45 mix-blend-screen"
        style={{
          backgroundImage: "url('/textures/float/masking-tape.jpg')",
          backgroundSize: "cover",
        }}
      />

      <div
        className={`absolute -right-3 top-8 z-20 h-px w-12 rotate-12 ${accentClass(
          accent
        )}`}
      />
    </>
  );
}

export default function TraceCard({ trace }: { trace: Trace }) {
  return (
    <article
      className={cardClass(trace.type, trace.damage)}
      style={{
        left: `${trace.x}%`,
        top: `${trace.y}%`,
        transform: `translate(-50%, -50%) rotate(${trace.rotate}deg)`,
      }}
    >
      <Tape accent={trace.accent} />

      <div
  className="pointer-events-none absolute inset-0 z-10 opacity-[0.22] mix-blend-screen"
  style={{ backgroundImage: "url('/textures/float/photocopy-noise.jpg')" }}
/>

<div
  className="pointer-events-none absolute inset-0 z-10 opacity-[0.16] mix-blend-screen"
  style={{ backgroundImage: "url('/textures/float/dust-scratches.jpg')" }}
/>

<div
  className="pointer-events-none absolute -bottom-4 -right-5 z-10 h-24 w-32 opacity-[0.22] mix-blend-screen"
  style={{
    backgroundImage: "url('/textures/float/fingerprint-smudge.jpg')",
    backgroundSize: "cover",
  }}
/>

      <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-200/50 shadow-[0_0_20px_rgba(255,255,255,.25)]" />

      <div className="pointer-events-none absolute -left-8 top-10 h-10 w-28 rotate-[-12deg] bg-white/10 blur-xl" />

      <ImagePanel trace={trace} />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">
            {trace.code}
          </p>
          <span className={`h-px w-8 shrink-0 ${accentClass(trace.accent)}`} />
        </div>

        <h2 className="text-sm uppercase tracking-[0.18em] text-zinc-100">
          {trace.title}
        </h2>

        {trace.note && (
          <p className="mt-3 text-xs leading-5 text-zinc-500">{trace.note}</p>
        )}
      </div>

      <div className="absolute bottom-2 right-3 rotate-[-8deg] text-[10px] text-white/20">
        {trace.damage === "heavy" ? "×" : "•"}
      </div>
    </article>
  );
}
