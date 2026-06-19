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
export const maxDuration = 300;
export const runtime = "nodejs";

type FloatRenderBody = {
  controls?: Partial<Record<FloatControlId, number>>;
  duration?: number;
  format?: string;
  slug?: string;
};

function slugForFile(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function trimOutput(value: string, limit = 12_000) {
  return value.length > limit ? value.slice(value.length - limit) : value;
}

function controlQuery(controls: FloatRenderBody["controls"]) {
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

function runFloatExport(args: string[]) {
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
            trimOutput(stderr || stdout || `Float render exited with ${code}.`)
          )
        );
      }
    });
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as FloatRenderBody;
  const slug = String(body.slug || "").trim();
  const format = body.format === "instagram" ? "instagram" : "youtube";
  const duration = Number(body.duration || 15);

  if (!slug) {
    return Response.json({ error: "Choose an artifact first." }, { status: 400 });
  }

  if (!Number.isFinite(duration) || duration < 1 || duration > 60) {
    return Response.json(
      { error: "Use a duration between 1 and 60 seconds." },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;
  const exportDir = path.join(process.cwd(), "public", "float-renders");
  const filename = `elsewhere-float-${slugForFile(slug)}-${format}-${Date.now()}.mp4`;
  const output = path.join(exportDir, filename);
  const controls = controlQuery(body.controls);
  const args = [
    path.join(process.cwd(), "scripts", "export-float-video.mjs"),
    "--slug",
    slug,
    "--format",
    format,
    "--duration",
    String(duration),
    "--origin",
    origin,
    "--output",
    output,
  ];

  if (controls) {
    args.push("--controls", controls);
  }

  await mkdir(exportDir, { recursive: true });

  try {
    const result = await runFloatExport(args);

    return Response.json({
      filename,
      log: trimOutput(result.stdout || result.stderr),
      url: `/float-renders/${filename}`,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The Float render could not be completed.",
      },
      { status: 500 }
    );
  }
}
