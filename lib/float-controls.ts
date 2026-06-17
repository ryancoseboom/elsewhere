export const FLOAT_CONTROL_DEFINITIONS = [
  { id: "sig", label: "Signal intensity", min: 40, max: 180, step: 5, defaultValue: 100 },
  { id: "mut", label: "Text mutation", min: 0, max: 180, step: 5, defaultValue: 100 },
  { id: "cscale", label: "Center text scale", min: 55, max: 145, step: 5, defaultValue: 100 },
  { id: "crate", label: "Center text change rate", min: 40, max: 220, step: 5, defaultValue: 100 },
  { id: "iden", label: "Image density", min: 35, max: 140, step: 5, defaultValue: 100 },
  { id: "irate", label: "Image change rate", min: 40, max: 220, step: 5, defaultValue: 100 },
  { id: "iscale", label: "Image scale", min: 70, max: 135, step: 5, defaultValue: 100 },
  { id: "vivid", label: "Image color", min: 40, max: 160, step: 5, defaultValue: 100 },
  { id: "tex", label: "Texture strength", min: 0, max: 180, step: 5, defaultValue: 100 },
  { id: "capsize", label: "Caption size", min: 50, max: 140, step: 5, defaultValue: 100 },
  { id: "capvis", label: "Caption visibility", min: 0, max: 140, step: 5, defaultValue: 100 },
  { id: "smooth", label: "Motion smoothness", min: 40, max: 180, step: 5, defaultValue: 100 },
  { id: "frames", label: "Frame marks", min: 0, max: 180, step: 5, defaultValue: 100 },
  { id: "color", label: "Color drift", min: 0, max: 180, step: 5, defaultValue: 100 },
  { id: "dark", label: "Vignette darkness", min: 40, max: 180, step: 5, defaultValue: 100 },
  { id: "spread", label: "Layout spread", min: 70, max: 140, step: 5, defaultValue: 100 },
  { id: "vbias", label: "Vertical bias", min: 60, max: 150, step: 5, defaultValue: 100 },
  { id: "lyric", label: "Lyric source weight", min: 0, max: 180, step: 5, defaultValue: 100 },
  { id: "frag", label: "Fragment length", min: 22, max: 72, step: 2, defaultValue: 34 },
  { id: "intro", label: "Intro visibility", min: 0, max: 100, step: 10, defaultValue: 100 },
] as const;

export type FloatControlId = (typeof FLOAT_CONTROL_DEFINITIONS)[number]["id"];
export type FloatControlValues = Record<FloatControlId, number>;

export const FLOAT_CONTROL_DEFAULTS = FLOAT_CONTROL_DEFINITIONS.reduce(
  (controls, definition) => ({
    ...controls,
    [definition.id]: definition.defaultValue,
  }),
  {} as FloatControlValues
);

export function clampFloatControl(id: FloatControlId, value: number) {
  const definition = FLOAT_CONTROL_DEFINITIONS.find((item) => item.id === id);

  if (!definition || !Number.isFinite(value)) {
    return FLOAT_CONTROL_DEFAULTS[id];
  }

  return Math.min(definition.max, Math.max(definition.min, value));
}

function firstParam(value: string | string[] | undefined | null) {
  return Array.isArray(value) ? value[0] : value;
}

export function readFloatControls(
  params:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined
) {
  const controls = { ...FLOAT_CONTROL_DEFAULTS };

  FLOAT_CONTROL_DEFINITIONS.forEach((definition) => {
    const raw =
      params instanceof URLSearchParams
        ? params.get(definition.id)
        : firstParam(params?.[definition.id]);

    if (raw == null || raw === "") return;

    controls[definition.id] = clampFloatControl(definition.id, Number(raw));
  });

  return controls;
}

export function writeFloatControlsToParams(
  params: URLSearchParams,
  controls: FloatControlValues
) {
  FLOAT_CONTROL_DEFINITIONS.forEach((definition) => {
    const value = clampFloatControl(definition.id, controls[definition.id]);

    if (value === definition.defaultValue) {
      params.delete(definition.id);
    } else {
      params.set(definition.id, String(value));
    }
  });

  return params;
}

export function changedFloatControlQuery(controls: FloatControlValues) {
  const params = new URLSearchParams();
  writeFloatControlsToParams(params, controls);
  return params.toString();
}
