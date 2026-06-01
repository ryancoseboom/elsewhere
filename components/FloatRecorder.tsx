"use client";

import { useEffect, useRef } from "react";

type FloatImage = {
  src: string;
  alt: string;
};

type FloatRecording = {
  blob: Blob;
  extension: "mp4" | "webm";
  mimeType: string;
};

type FloatRecorderProps = {
  height: number;
  images: FloatImage[];
  seed: number;
  textures: string[];
  width: number;
  onComplete: (recording: FloatRecording) => void;
  onError: (message: string) => void;
};

type CanvasTile = {
  column: number;
  columnSpan: number;
  imageIndex: number;
  phase: number;
  row: number;
  rowSpan: number;
  textureIndex: number;
};

type TextureLayer = {
  column: number;
  columnSpan: number;
  phase: number;
  row: number;
  rowSpan: number;
  textureOffset: number;
};

type ImageLayer = {
  column: number;
  columnSpan: number;
  imageOffset: number;
  phase: number;
  row: number;
  rowSpan: number;
};

const recordingDuration = 30_000;
const gridColumns = 12;
const gridRows = 8;

function seededUnit(seed: number) {
  const value = Math.sin(seed * 9187.17) * 10000;
  return value - Math.floor(value);
}

function seededRange(seed: number, minimum: number, maximum: number) {
  return minimum + seededUnit(seed) * (maximum - minimum);
}

function tileSpan(seed: number, maximum: number) {
  const size = seededUnit(seed);

  if (size < 0.28) return 1;
  if (size < 0.56) return 2;
  if (size < 0.76) return 3;
  if (size < 0.9) return 4;

  return Math.floor(seededRange(seed + 1, 5, maximum + 1));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  panX = 0,
  panY = 0
) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  context.drawImage(
    image,
    x + (width - drawWidth) / 2 + panX,
    y + (height - drawHeight) / 2 + panY,
    drawWidth,
    drawHeight
  );
}

function layerFrame(seconds: number, phase: number, visibleDuration: number, fadeDuration: number) {
  const cycleDuration = visibleDuration + fadeDuration * 2;
  const timeline = seconds + phase;
  const elapsed = timeline % cycleDuration;
  const cycle = Math.floor(timeline / cycleDuration);

  if (elapsed < fadeDuration) {
    return { cycle, opacity: elapsed / fadeDuration };
  }

  if (elapsed < fadeDuration + visibleDuration) {
    return { cycle, opacity: 1 };
  }

  return { cycle, opacity: (cycleDuration - elapsed) / fadeDuration };
}

function makeMaskedTexture(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  const size = 1024;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.filter = "brightness(46%) contrast(320%)";
  drawCoverImage(context, image, image.naturalWidth, image.naturalHeight, 0, 0, size, size);
  context.filter = "none";
  const pixels = context.getImageData(0, 0, size, size);

  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const alpha = pixels.data[index + 3];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const markOpacity = Math.max(0, Math.min(1, (luminance - 58) / 142));

    pixels.data[index] = 255;
    pixels.data[index + 1] = 255;
    pixels.data[index + 2] = 255;
    pixels.data[index + 3] = Math.round(alpha * markOpacity);
  }

  context.putImageData(pixels, 0, 0);
  context.globalCompositeOperation = "destination-in";

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.16,
    size / 2,
    size / 2,
    size * 0.54
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.62, "rgba(0, 0, 0, 0.9)");
  gradient.addColorStop(0.83, "rgba(0, 0, 0, 0.38)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  return canvas;
}

function makeMaskedImage(image: HTMLImageElement, aspectRatio = 1) {
  const canvas = document.createElement("canvas");
  const size = 1024;
  canvas.width = aspectRatio >= 1 ? size : Math.round(size * aspectRatio);
  canvas.height = aspectRatio >= 1 ? Math.round(size / aspectRatio) : size;

  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.filter = "brightness(70%) contrast(112%) saturate(82%)";
  drawCoverImage(
    context,
    image,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  context.filter = "none";
  context.globalCompositeOperation = "destination-in";

  const gradient = context.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    Math.min(canvas.width, canvas.height) * 0.14,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) * 0.56
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.58, "rgba(0, 0, 0, 0.82)");
  gradient.addColorStop(0.82, "rgba(0, 0, 0, 0.3)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}

function packTiles(seed: number, imageCount: number, textureCount: number) {
  const occupied = Array.from({ length: gridRows }, () =>
    Array.from({ length: gridColumns }, () => false)
  );
  const tiles: CanvasTile[] = [];

  for (let index = 0; index < 24; index += 1) {
    const tileSeed = seed + index * 7 + 101;
    const requestedColumnSpan = tileSpan(tileSeed + 29, 8);
    const requestedRowSpan = tileSpan(tileSeed + 30, 7);
    let placed = false;

    for (let row = 0; row < gridRows && !placed; row += 1) {
      for (let column = 0; column < gridColumns && !placed; column += 1) {
        const columnSpan = Math.min(requestedColumnSpan, gridColumns - column);
        const rowSpan = Math.min(requestedRowSpan, gridRows - row);
        const blocked = Array.from({ length: rowSpan }, (_, rowOffset) =>
          Array.from({ length: columnSpan }, (_, columnOffset) =>
            occupied[row + rowOffset][column + columnOffset]
          ).some(Boolean)
        ).some(Boolean);

        if (blocked) continue;

        for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
          for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
            occupied[row + rowOffset][column + columnOffset] = true;
          }
        }

        tiles.push({
          column,
          columnSpan,
          imageIndex: Math.floor(seededUnit(tileSeed + 8) * imageCount),
          phase: seededRange(tileSeed + 32, 0, Math.PI * 2),
          row,
          rowSpan,
          textureIndex: Math.floor(seededUnit(tileSeed + 34) * textureCount),
        });
        placed = true;
      }
    }
  }

  for (let row = 0; row < gridRows; row += 1) {
    for (let column = 0; column < gridColumns; column += 1) {
      if (occupied[row][column]) continue;

      const tileSeed = seed + row * gridColumns + column + 2001;
      occupied[row][column] = true;
      tiles.push({
        column,
        columnSpan: 1,
        imageIndex: Math.floor(seededUnit(tileSeed + 1) * imageCount),
        phase: seededRange(tileSeed + 2, 0, Math.PI * 2),
        row,
        rowSpan: 1,
        textureIndex: Math.floor(seededUnit(tileSeed + 3) * textureCount),
      });
    }
  }

  return tiles;
}

function getRecordingFormat() {
  const mp4Types = [
    "video/mp4;codecs=avc1",
    "video/mp4;codecs=h264",
    "video/mp4",
  ];

  for (const mimeType of mp4Types) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return { extension: "mp4" as const, mimeType };
    }
  }

  const webmTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mimeType =
    webmTypes.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ||
    "";

  return { extension: "webm" as const, mimeType };
}

export default function FloatRecorder({
  height,
  images,
  seed,
  textures,
  width,
  onComplete,
  onError,
}: FloatRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context || typeof MediaRecorder === "undefined") {
      onError("This browser cannot record FLOAT videos.");
      return;
    }

    const drawingContext = context;
    let animationFrame = 0;
    let stopTimer = 0;
    let stopped = false;
    const format = getRecordingFormat();
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: format.mimeType || undefined,
      videoBitsPerSecond: 10_000_000,
    });
    const chunks: Blob[] = [];

    canvas.width = width;
    canvas.height = height;

    Promise.all([
      Promise.all(images.map((image) => loadImage(image.src))),
      Promise.all(textures.map((texture) => loadImage(texture))),
    ]).then(([loadedImages, loadedTextures]) => {
      if (stopped) return;

      const availableImages = loadedImages.filter(
        (image): image is HTMLImageElement => Boolean(image)
      );
      const availableTextures = loadedTextures.filter(
        (image): image is HTMLImageElement => Boolean(image)
      );

      if (availableImages.length === 0) {
        onError("FLOAT could not load any images for recording.");
        return;
      }

      const maskedTextures = availableTextures.map(makeMaskedTexture);
      const tiles = packTiles(seed, availableImages.length, maskedTextures.length);
      const layers = Array.from({ length: 12 }, (_, index): TextureLayer => {
        const layerSeed = seed + index * 31 + 701;

        return {
          column: Math.floor(seededRange(layerSeed + 1, 0, 9)),
          columnSpan: Math.floor(seededRange(layerSeed + 2, 4, 11)),
          phase: seededRange(layerSeed + 3, 0, Math.PI * 2),
          row: Math.floor(seededRange(layerSeed + 4, 0, 7)),
          rowSpan: Math.floor(seededRange(layerSeed + 5, 3, 9)),
          textureOffset: Math.floor(seededUnit(layerSeed + 6) * maskedTextures.length),
        };
      });
      const imageLayers = Array.from({ length: 4 }, (_, index): ImageLayer => {
        const layerSeed = seed + index * 47 + 1701;

        return {
          column: Math.floor(seededRange(layerSeed + 1, 0, 9)),
          columnSpan: Math.floor(seededRange(layerSeed + 2, 5, 13)),
          imageOffset: Math.floor(seededUnit(layerSeed + 3) * availableImages.length),
          phase: seededRange(layerSeed + 4, 0, Math.PI * 2),
          row: Math.floor(seededRange(layerSeed + 5, 0, 7)),
          rowSpan: Math.floor(seededRange(layerSeed + 6, 4, 10)),
        };
      });
      const maskedImageLayers = imageLayers.map((layer) =>
        availableImages.map((image) =>
          makeMaskedImage(image, layer.columnSpan / layer.rowSpan)
        )
      );
      const startedAt = performance.now();
      const gap = Math.max(8, Math.round(Math.min(width, height) * 0.008));
      const cellWidth = width / gridColumns;
      const cellHeight = height / gridRows;

      function draw(now: number) {
        if (stopped) return;

        const elapsed = now - startedAt;
        const seconds = elapsed / 1000;
        drawingContext.globalCompositeOperation = "source-over";
        drawingContext.globalAlpha = 1;
        drawingContext.fillStyle = "#000";
        drawingContext.fillRect(0, 0, width, height);

        tiles.forEach((tile, index) => {
          const image = availableImages[tile.imageIndex];
          const x = tile.column * cellWidth + gap / 2;
          const y = tile.row * cellHeight + gap / 2;
          const tileWidth = Math.min(width - x, tile.columnSpan * cellWidth - gap);
          const tileHeight = Math.min(height - y, tile.rowSpan * cellHeight - gap);
          const panX = Math.sin(seconds * 0.17 + tile.phase) * tileWidth * 0.1;
          const panY = Math.cos(seconds * 0.13 + tile.phase) * tileHeight * 0.12;

          if (tileWidth <= 0 || tileHeight <= 0) return;

          drawingContext.save();
          drawingContext.beginPath();
          drawingContext.moveTo(x + seededRange(index + seed, 0, gap), y);
          drawingContext.lineTo(x + tileWidth, y + seededRange(index + seed + 1, 0, gap));
          drawingContext.lineTo(x + tileWidth - seededRange(index + seed + 2, 0, gap), y + tileHeight);
          drawingContext.lineTo(x, y + tileHeight - seededRange(index + seed + 3, 0, gap));
          drawingContext.closePath();
          drawingContext.clip();
          drawCoverImage(
            drawingContext,
            image,
            image.naturalWidth,
            image.naturalHeight,
            x,
            y,
            tileWidth,
            tileHeight,
            panX,
            panY
          );

          if (maskedTextures.length > 0) {
            drawingContext.globalCompositeOperation = "screen";
            drawingContext.globalAlpha = 0.06 + Math.sin(seconds * 2.1 + tile.phase) * 0.035;
            drawCoverImage(
              drawingContext,
              maskedTextures[tile.textureIndex],
              maskedTextures[tile.textureIndex].width,
              maskedTextures[tile.textureIndex].height,
              x - tileWidth * 0.08,
              y - tileHeight * 0.08,
              tileWidth * 1.16,
              tileHeight * 1.16
            );
          }

          drawingContext.restore();
        });

        drawingContext.globalCompositeOperation = "screen";
        imageLayers.forEach((layer, index) => {
          const frame = layerFrame(seconds, layer.phase, 7.35, 1.45);
          const layerImages = maskedImageLayers[index];
          const image = layerImages[(layer.imageOffset + frame.cycle) % layerImages.length];
          const x = layer.column * cellWidth;
          const y = layer.row * cellHeight;
          const layerWidth = layer.columnSpan * cellWidth;
          const layerHeight = layer.rowSpan * cellHeight;
          const pulse = Math.sin(seconds * (0.55 + (index % 3) * 0.12) + layer.phase);
          const panX = Math.sin(seconds * 0.12 + layer.phase) * layerWidth * 0.08;
          const panY = Math.cos(seconds * 0.1 + layer.phase) * layerHeight * 0.08;

          drawingContext.globalAlpha = (0.07 + Math.max(0, pulse) * 0.18) * frame.opacity;
          drawingContext.drawImage(
            image,
            x - layerWidth * 0.16 + panX,
            y - layerHeight * 0.16 + panY,
            layerWidth * 1.32,
            layerHeight * 1.32
          );
        });

        if (maskedTextures.length > 0) {
          drawingContext.globalCompositeOperation = "screen";
          layers.forEach((layer, index) => {
            const frame = layerFrame(seconds, layer.phase, 3.95, 0.95);
            const texture = maskedTextures[(layer.textureOffset + frame.cycle) % maskedTextures.length];
            const x = layer.column * cellWidth;
            const y = layer.row * cellHeight;
            const layerWidth = layer.columnSpan * cellWidth;
            const layerHeight = layer.rowSpan * cellHeight;
            const pulse = Math.sin(seconds * (2.3 + (index % 4) * 0.42) + layer.phase);
            const panX = Math.sin(seconds * 0.24 + layer.phase) * layerWidth * 0.06;
            const panY = Math.cos(seconds * 0.2 + layer.phase) * layerHeight * 0.06;

            drawingContext.globalAlpha = (0.1 + Math.max(0, pulse) * 0.24) * frame.opacity;
            drawCoverImage(
              drawingContext,
              texture,
              texture.width,
              texture.height,
              x - layerWidth * 0.18,
              y - layerHeight * 0.18,
              layerWidth * 1.36,
              layerHeight * 1.36,
              panX,
              panY
            );
          });
        }

        if (progressRef.current) {
          progressRef.current.style.width = `${Math.min(100, (elapsed / recordingDuration) * 100)}%`;
        }

        if (elapsed < recordingDuration) {
          animationFrame = requestAnimationFrame(draw);
        }
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (stopped) return;

        onComplete({
          blob: new Blob(chunks, { type: format.mimeType || recorder.mimeType }),
          extension: format.extension,
          mimeType: format.mimeType || recorder.mimeType,
        });
      };
      recorder.start(1000);
      animationFrame = requestAnimationFrame(draw);
      stopTimer = window.setTimeout(() => recorder.stop(), recordingDuration);
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(stopTimer);
      stream.getTracks().forEach((track) => track.stop());
      if (recorder.state !== "inactive") recorder.stop();
    };
  }, [height, images, onComplete, onError, seed, textures, width]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-20 h-full w-full bg-black object-contain"
      />
      <div className="absolute bottom-0 left-0 z-30 h-px w-full bg-black/50">
        <div ref={progressRef} className="h-full w-0 bg-stone-400/70" />
      </div>
    </>
  );
}

export type { FloatRecording };
