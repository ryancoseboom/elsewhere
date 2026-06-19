import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import path from "path";
import {
  FLOAT_CONTROL_DEFINITIONS,
  FLOAT_CONTROL_DEFAULTS,
  clampFloatControl,
  type FloatControlId,
} from "@/lib/float-controls";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const runtime = "nodejs";

type FloatCycleId = "central" | "image" | "phase" | "texture" | "text";

type FloatStillBody = {
  controls?: Partial<Record<FloatControlId, number>>;
  cycles?: Partial<Record<FloatCycleId, number>>;
  format?: string;
  slug?: string;
};

const cycleParamMap = {
  central: "cycleCentral",
  image: "cycleImage",
  phase: "cyclePhase",
  texture: "cycleTexture",
  text: "cycleText",
} satisfies Record<FloatCycleId, string>;

function slugForFile(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function trimOutput(value: string, limit = 12_000) {
  return value.length > limit ? value.slice(value.length - limit) : value;
}

function controlQuery(controls: FloatStillBody["controls"]) {
  const params = new URLSearchParams();

  FLOAT_CONTROL_DEFINITIONS.forEach((definition) => {
    const rawValue = controls?.[definition.id];
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) return;

    const value = clampFloatControl(definition.id, numericValue);

    if (value !== FLOAT_CONTROL_DEFAULTS[definition.id]) {
      params.set(definition.id, String(value));
    }
  });

  return params.toString();
}

function cycleQuery(cycles: FloatStillBody["cycles"]) {
  const params = new URLSearchParams();

  (Object.keys(cycleParamMap) as FloatCycleId[]).forEach((id) => {
    const value = Math.max(0, Math.floor(Number(cycles?.[id] || 0)));

    if (Number.isFinite(value) && value > 0) {
      params.set(cycleParamMap[id], String(value));
    }
  });

  return params.toString();
}

function runFloatStillExport(args: string[]) {
  return new Promise<{ stderr: string; stdout: string }>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout = trimOutput(stdout + String(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderr = trimOutput(stderr + String(chunk));
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stderr, stdout });
      } else {
        reject(
          new Error(
            trimOutput(stderr || stdout || `Float still exited with ${code}.`)
          )
        );
      }
    });
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as FloatStillBody;
  const slug = String(body.slug || "").trim();
  const format = body.format === "instagram" ? "instagram" : "youtube";

  if (!slug) {
    return Response.json({ error: "Choose an artifact first." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const exportDir = path.join(process.cwd(), "public", "float-stills");
  const filename = `elsewhere-float-${slugForFile(slug)}-${format}-${Date.now()}.png`;
  const output = path.join(exportDir, filename);
  const controls = controlQuery(body.controls);
  const cycles = cycleQuery(body.cycles);
  const args = [
    path.join(process.cwd(), "scripts", "export-float-still.mjs"),
    "--slug",
    slug,
    "--format",
    format,
    "--origin",
    origin,
    "--output",
    output,
  ];

  if (controls) {
    args.push("--controls", controls);
  }

  if (cycles) {
    args.push("--cycles", cycles);
  }

  await mkdir(exportDir, { recursive: true });

  try {
    const result = await runFloatStillExport(args);

    return Response.json({
      filename,
      log: trimOutput(result.stdout || result.stderr),
      url: `/float-stills/${filename}`,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The Float still could not be captured.",
      },
      { status: 500 }
    );
  }
}
