"use client";

import { useState } from "react";
import {
  FLOAT_CONTROL_DEFINITIONS,
  FLOAT_CONTROL_GROUPS,
  type FloatControlValues,
} from "@/lib/float-controls";

const definitionMap = new Map(
  FLOAT_CONTROL_DEFINITIONS.map((definition) => [definition.id, definition])
);

export default function FloatLookControls({
  controls,
  onChange,
  grouped = false,
  variant,
}: {
  controls: FloatControlValues;
  grouped?: boolean;
  onChange: (controls: FloatControlValues) => void;
  variant?: "flat" | "grouped" | "tabs";
}) {
  const mode = variant || (grouped ? "grouped" : "flat");
  const [activeGroupTitle, setActiveGroupTitle] = useState<string>(
    FLOAT_CONTROL_GROUPS[0]?.title || ""
  );
  const activeGroup =
    FLOAT_CONTROL_GROUPS.find((group) => group.title === activeGroupTitle) ||
    FLOAT_CONTROL_GROUPS[0];
  const renderControl = (definition: (typeof FLOAT_CONTROL_DEFINITIONS)[number]) => (
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
  );

  if (mode === "tabs") {
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          {FLOAT_CONTROL_GROUPS.map((group) => (
            <button
              className={`border px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] transition ${
                activeGroup.title === group.title
                  ? "border-stone-300 bg-stone-200 text-stone-950"
                  : "border-stone-800 bg-black/20 text-stone-500 hover:border-stone-600 hover:text-stone-200"
              }`}
              key={group.title}
              type="button"
              onClick={() => setActiveGroupTitle(group.title)}
            >
              {group.title}
            </button>
          ))}
        </div>
        <section className="border border-stone-800/80 bg-black/20 p-3">
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.28em] text-stone-400">
            {activeGroup.title}
          </h3>
          <div className="grid gap-3">
            {activeGroup.controls.map((id) => {
              const definition = definitionMap.get(id);

              return definition ? renderControl(definition) : null;
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={mode === "grouped" ? "grid gap-4" : "grid gap-3"}>
      {mode === "grouped"
        ? FLOAT_CONTROL_GROUPS.map((group) => (
            <section
              className="border border-stone-800/80 bg-black/20 p-3"
              key={group.title}
            >
              <h3 className="mb-3 text-[10px] uppercase tracking-[0.28em] text-stone-400">
                {group.title}
              </h3>
              <div className="grid gap-3">
                {group.controls.map((id) => {
                  const definition = definitionMap.get(id);

                  return definition ? renderControl(definition) : null;
                })}
              </div>
            </section>
          ))
        : FLOAT_CONTROL_DEFINITIONS.map(renderControl)}
    </div>
  );
}
