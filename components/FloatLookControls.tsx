"use client";

import {
  FLOAT_CONTROL_DEFINITIONS,
  type FloatControlValues,
} from "@/lib/float-controls";

export default function FloatLookControls({
  controls,
  onChange,
}: {
  controls: FloatControlValues;
  onChange: (controls: FloatControlValues) => void;
}) {
  return (
    <div className="grid gap-3">
      {FLOAT_CONTROL_DEFINITIONS.map((definition) => (
        <label key={definition.id} className="block">
          <span className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-stone-500">
            <span>{definition.label}</span>
            <span className="font-mono text-stone-600">
              {controls[definition.id]}
            </span>
          </span>
          <input
            className="mt-1 w-full accent-stone-200"
            max={definition.max}
            min={definition.min}
            step={definition.step}
            type="range"
            value={controls[definition.id]}
            onChange={(event) =>
              onChange({
                ...controls,
                [definition.id]: Number(event.target.value),
              })
            }
          />
        </label>
      ))}
    </div>
  );
}
