import TraceCard from "./TraceCard";
import TraceConnections from "./TraceConnections";
import { links, traces } from "./traceData";

export default function TraceWall() {
  return (
    <div className="relative h-[740px] overflow-hidden rounded-2xl border border-white/10 bg-[#030303] shadow-[0_0_100px_rgba(0,0,0,.95)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(255,255,255,.075),transparent_22%),radial-gradient(circle_at_20%_75%,rgba(122,16,22,.13),transparent_18%),radial-gradient(circle_at_83%_18%,rgba(83,104,121,.11),transparent_16%)]" />

      <div className="absolute inset-0 opacity-[0.075] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.95)_0_1px,transparent_1px_3px)]" />

      <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle,rgba(255,255,255,.55)_0_1px,transparent_1px)] [background-size:19px_17px]" />

      <div
  className="absolute inset-0 opacity-[0.22] mix-blend-screen"
  style={{ backgroundImage: "url('/textures/float/photocopy-noise.jpg')" }}
/>

<div
  className="absolute inset-0 opacity-[0.18] mix-blend-screen"
  style={{ backgroundImage: "url('/textures/float/dust-scratches.jpg')" }}
/>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_28%,rgba(0,0,0,.9)_100%)]" />

      <div className="absolute left-[8%] top-[13%] h-24 w-px bg-[#7a1016]/60" />
      <div className="absolute bottom-[11%] right-[12%] h-px w-36 bg-[#9b814e]/50" />
      <div className="absolute right-[34%] top-[10%] h-12 w-12 border border-[#566b54]/30" />
      <div className="absolute left-[39%] top-[70%] h-7 w-28 border-t border-[#536879]/35" />

      <TraceConnections traces={traces} links={links} />

      {traces.map((trace) => (
        <TraceCard key={trace.id} trace={trace} />
      ))}

      <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-screen [background-image:linear-gradient(115deg,transparent_0%,rgba(255,255,255,.25)_45%,transparent_48%,transparent_100%)]" />
    </div>
  );
}
