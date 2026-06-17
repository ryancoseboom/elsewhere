import { DRIFT_MOODS } from "@/lib/drift-moods";

export default function DriftMoodCheckboxes({
  defaultValue = [],
}: {
  defaultValue?: string[] | null;
}) {
  const selected = new Set(defaultValue || []);

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
        Drift Time Of Day
      </legend>
      <div className="flex flex-wrap gap-2">
        {DRIFT_MOODS.map((mood) => (
          <label
            key={mood.value}
            className="flex cursor-pointer items-center gap-2 border border-stone-800 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-400 transition hover:border-stone-500 hover:text-stone-100"
          >
            <input
              type="checkbox"
              name="drift_moods"
              value={mood.value}
              defaultChecked={selected.has(mood.value)}
            />
            {mood.label}
          </label>
        ))}
      </div>
      <p className="text-xs leading-5 text-stone-600">
        Master moods for Drift navigation. Use one or two when possible.
      </p>
    </fieldset>
  );
}
