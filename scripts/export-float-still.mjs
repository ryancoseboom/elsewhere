#!/usr/bin/env node

import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const formats = {
  youtube: { width: 1920, height: 1080, format: "youtube" },
  horizontal: { width: 1920, height: 1080, format: "youtube" },
  instagram: { width: 1080, height: 1920, format: "instagram" },
  vertical: { width: 1080, height: 1920, format: "instagram" },
};

function readArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (!item.startsWith("--")) continue;

    const key = item.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      index += 1;
    }
  }

  return args;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugForFile(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function outputPath(value, fallback) {
  const rawOutput = value?.trim() || fallback;
  const resolvedOutput = path.isAbsolute(rawOutput)
    ? rawOutput
    : path.join(homedir(), "Downloads", rawOutput);
  const extension = path.extname(resolvedOutput);

  return extension ? resolvedOutput : `${resolvedOutput}.png`;
}

function randomPort() {
  return 41_000 + Math.floor(Math.random() * 12_000);
}

async function rmWithRetries(target) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 });
      return;
    } catch (error) {
      if (attempt === 4) {
        console.warn(`Could not fully remove temporary still folder: ${target}`);
        console.warn(error instanceof Error ? error.message : String(error));
        return;
      }

      await wait(250);
    }
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function waitForChrome(port) {
  const started = Date.now();
  let lastError;

  while (Date.now() - started < 10_000) {
    try {
      await fetchJson(`http://127.0.0.1:${port}/json/version`);
      return;
    } catch (error) {
      lastError = error;
      await wait(120);
    }
  }

  throw lastError || new Error("Chrome did not start.");
}

async function openChromeTarget(port, url) {
  const endpoint = `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`;

  try {
    return await fetchJson(endpoint, { method: "PUT" });
  } catch {
    return fetchJson(endpoint);
  }
}

class ChromeSession {
  constructor(webSocketUrl) {
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.socket = new WebSocket(webSocketUrl);
    this.ready = new Promise((resolve, reject) => {
      this.socket.once("open", resolve);
      this.socket.once("error", reject);
    });
    this.socket.on("message", (message) => {
      const payload = JSON.parse(String(message));

      if (payload.id && this.pending.has(payload.id)) {
        const { reject, resolve } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) reject(new Error(payload.error.message));
        else resolve(payload.result);
        return;
      }

      const listeners = this.events.get(payload.method) || [];
      listeners.forEach((listener) => listener(payload.params));
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = (this.id += 1);

    return new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method, timeout = 15_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeout);
      const listener = (params) => {
        cleanup();
        resolve(params);
      };
      const cleanup = () => {
        clearTimeout(timer);
        this.events.set(
          method,
          (this.events.get(method) || []).filter((item) => item !== listener)
        );
      };

      this.events.set(method, [...(this.events.get(method) || []), listener]);
    });
  }

  close() {
    this.socket.close();
  }
}

async function assertStillCreated(output) {
  let file;

  try {
    file = await stat(output);
  } catch {
    throw new Error(`No still image was created at ${output}.`);
  }

  if (file.size === 0) {
    throw new Error(`The still image at ${output} is empty.`);
  }
}

const args = readArgs(process.argv.slice(2));
const slug = args.slug || "coco";
const formatName = args.format || "youtube";
const format = formats[formatName];
const origin = args.origin || "http://localhost:3000";
const controls = args.controls || "";
const cycles = args.cycles || "";

if (!format) {
  throw new Error("Use --format youtube or instagram.");
}

const output = outputPath(
  args.output,
  `elsewhere-float-${slugForFile(slug)}-${format.format}-${Date.now()}.png`
);
const outputDir = path.dirname(output);
const tempRoot = await mkdtemp(path.join(tmpdir(), "elsewhere-float-still-"));
const chromeProfile = path.join(tempRoot, "chrome");
const port = randomPort();
const renderParams = new URLSearchParams({
  format: format.format,
  still: "1",
});

if (controls) {
  const controlParams = new URLSearchParams(controls);
  controlParams.forEach((value, key) => renderParams.set(key, value));
}

if (cycles) {
  const cycleParams = new URLSearchParams(cycles);
  cycleParams.forEach((value, key) => renderParams.set(key, value));
}

const url = `${origin.replace(/\/$/, "")}/float-render/${encodeURIComponent(
  slug
)}?${renderParams.toString()}`;
let chrome;
let session;

await mkdir(outputDir, { recursive: true });

try {
  console.log(`Capturing Float still: ${url}`);
  chrome = spawn(chromePath, [
    "--headless=new",
    "--hide-scrollbars",
    "--mute-audio",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${chromeProfile}`,
    `--window-size=${format.width},${format.height}`,
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });

  chrome.stderr.on("data", (chunk) => {
    const text = String(chunk);
    if (/error|failed/i.test(text)) process.stderr.write(text);
  });

  await waitForChrome(port);
  const target = await openChromeTarget(port, url);
  session = new ChromeSession(target.webSocketDebuggerUrl);
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: format.height,
    mobile: false,
    width: format.width,
  });
  const pageLoaded = session.waitForEvent("Page.loadEventFired").catch(() => {});
  await session.send("Page.navigate", { url });
  await pageLoaded;
  await wait(1200);
  await session.send("Runtime.evaluate", {
    expression:
      "document.documentElement.style.cursor='none'; document.body.style.cursor='none';",
  });

  const image = await session.send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
    fromSurface: true,
  });

  await writeFile(output, image.data, "base64");
  await assertStillCreated(output);
  console.log(`Saved ${output}`);
} finally {
  session?.close();
  if (chrome && !chrome.killed) chrome.kill();
  await wait(500);
  await rmWithRetries(tempRoot);
}
