import type { Trace, TraceLink } from "./traceData";

function lineClass(strength: TraceLink["strength"]) {
  if (strength === "confirmed") return "stroke-zinc-200/20";
  if (strength === "suspected") return "stroke-zinc-200/12 [stroke-dasharray:8_9]";
  return "stroke-zinc-200/7 [stroke-dasharray:2_11]";
}

function getTrace(traces: Trace[], id: string) {
  return traces.find((trace) => trace.id === id);
}

export default function TraceConnections({
  traces,
  links,
}: {
  traces: Trace[];
  links: TraceLink[];
}) {
  return (
    <svg className="absolute inset-0 z-0 h-full w-full">
      {links.map((link, index) => {
        const from = getTrace(traces, link.from);
        const to = getTrace(traces, link.to);

        if (!from || !to) return null;

        const mx = (from.x + to.x) / 2 + (index % 2 === 0 ? 4 : -5);
        const my = (from.y + to.y) / 2 - 10 + (index % 3) * 4;

        return (
          <path
            key={`${link.from}-${link.to}`}
            d={`M ${from.x}% ${from.y}% Q ${mx}% ${my}% ${to.x}% ${to.y}%`}
            className={`fill-none ${lineClass(link.strength)}`}
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}