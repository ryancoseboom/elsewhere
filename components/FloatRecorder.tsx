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
  captionText?: string;
  captionTitles?: string[];
  catalogSignals?: string[];
  centralTexts?: string[];
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
const recordingImageLimit = 20;
const recordingTextureLimit = 7;
const mutationGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/*-+<>[]{}?";

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

function mutateText(text: string, seed: number, tick: number, intensity: number) {
  return Array.from(text)
    .map((char, index) => {
      if (char === " ") return " ";

      const unit = seededUnit(seed + tick * 41 + index * 19);
      if (unit > intensity) return char;

      return mutationGlyphs[
        Math.floor(seededUnit(seed + tick * 53 + index * 29) * mutationGlyphs.length)
      ] || char;
    })
    .join("");
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;

    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);
  return lines.slice(0, 4);
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

  return canvas;
}

function packTiles(
  seed: number,
  imageCount: number,
  textureCount: number,
  gridColumns: number,
  gridRows: number
) {
  const occupied = Array.from({ length: gridRows }, () =>
    Array.from({ length: gridColumns }, () => false)
  );
  const tiles: CanvasTile[] = [];

  for (let index = 0; index < (gridColumns > gridRows ? 24 : 28); index += 1) {
    const tileSeed = seed + index * 7 + 101;
    const requestedColumnSpan = tileSpan(tileSeed + 29, Math.min(8, gridColumns));
    const requestedRowSpan = tileSpan(tileSeed + 30, Math.min(7, gridRows));
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
  captionText,
  captionTitles = [],
  catalogSignals = [],
  centralTexts = [],
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
      Promise.all(
        images.slice(0, recordingImageLimit).map((image) => loadImage(image.src))
      ),
      Promise.all(textures.slice(0, recordingTextureLimit).map(loadImage)),
    ]).then(([loadedImages, loadedTextures]) => {
      if (stopped) return;

      const availableImages = loadedImages.filter(
        (image): image is HTMLImageElement => Boolean(image)
      ).slice(0, recordingImageLimit);
      const availableTextures = loadedTextures.filter(
        (image): image is HTMLImageElement => Boolean(image)
      ).slice(0, recordingTextureLimit);

      if (availableImages.length === 0) {
        onError("FLOAT could not load any images for recording.");
        return;
      }

      const maskedTextures = availableTextures.map(makeMaskedTexture);
      const isPortrait = height > width;
      const gridColumns = isPortrait ? 8 : 12;
      const gridRows = isPortrait ? 12 : 8;
      const tiles = packTiles(
        seed,
        availableImages.length,
        maskedTextures.length,
        gridColumns,
        gridRows
      );
      const layers = Array.from({ length: 9 }, (_, index): TextureLayer => {
        const layerSeed = seed + index * 31 + 701;

        return {
          column: Math.floor(seededRange(layerSeed + 1, 0, Math.max(1, gridColumns - 3))),
          columnSpan: Math.floor(seededRange(layerSeed + 2, 3, gridColumns + 1)),
          phase: seededRange(layerSeed + 3, 0, Math.PI * 2),
          row: Math.floor(seededRange(layerSeed + 4, 0, Math.max(1, gridRows - 2))),
          rowSpan: Math.floor(seededRange(layerSeed + 5, 3, gridRows + 1)),
          textureOffset: Math.floor(seededUnit(layerSeed + 6) * maskedTextures.length),
        };
      });
      const imageLayers = Array.from({ length: 3 }, (_, index): ImageLayer => {
        const layerSeed = seed + index * 47 + 1701;

        return {
          column: Math.floor(seededRange(layerSeed + 1, 0, Math.max(1, gridColumns - 3))),
          columnSpan: Math.floor(seededRange(layerSeed + 2, 4, gridColumns + 1)),
          imageOffset: Math.floor(seededUnit(layerSeed + 3) * availableImages.length),
          phase: seededRange(layerSeed + 4, 0, Math.PI * 2),
          row: Math.floor(seededRange(layerSeed + 5, 0, Math.max(1, gridRows - 3))),
          rowSpan: Math.floor(seededRange(layerSeed + 6, 4, gridRows + 1)),
        };
      });
      const maskedImages = availableImages.map((image) => makeMaskedImage(image, 1.25));
      const startedAt = performance.now();
      const gap = Math.max(8, Math.round(Math.min(width, height) * 0.008));
      const cellWidth = width / gridColumns;
      const cellHeight = height / gridRows;
      const fallbackCentral = ["SIGNAL LOSS / STILL LISTENING"];
      const centralPool = centralTexts.length ? centralTexts : fallbackCentral;
      const titlePool = captionTitles.length ? captionTitles : images.map((image) => image.alt);
      const catalogPool = catalogSignals.length
        ? catalogSignals
        : ["ELSEWHERE / FLOAT -- ARCHIVE / SIGNAL -- MEMORY / INDEX"];

      function draw(now: number) {
        if (stopped) return;

        const elapsed = now - startedAt;
        const seconds = elapsed / 1000;
        const tick = Math.floor(seconds * 5);
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

        drawingContext.save();
        drawingContext.globalCompositeOperation = "screen";
        drawingContext.textAlign = "left";
        drawingContext.textBaseline = "top";
        drawingContext.font = `${Math.max(12, Math.round(width * 0.007))}px "Courier New", monospace`;
        drawingContext.fillStyle = "rgba(168, 162, 158, 0.42)";
        catalogPool.slice(0, 4).forEach((line, index) => {
          drawingContext.fillText(
            mutateText(line.toUpperCase(), seed + index * 73, tick, 0.12),
            Math.round(width * 0.035),
            Math.round(height * 0.024 + index * Math.max(15, height * 0.014)),
            Math.round(width * 0.88)
          );
        });
        drawingContext.restore();

        drawingContext.globalCompositeOperation = "screen";
        imageLayers.forEach((layer, index) => {
          const frame = layerFrame(seconds, layer.phase, 7.35, 1.45);
          const image = maskedImages[(layer.imageOffset + frame.cycle) % maskedImages.length];
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

        for (let index = 0; index < 5; index += 1) {
          const frameSeed = seed + index * 79 + Math.floor(seconds / 2.4) * 199;
          const color = ["rgba(0,0,0,0.72)", "rgba(168,162,158,0.54)", "rgba(245,245,244,0.54)", "rgba(185,28,28,0.68)"][
            Math.floor(seededUnit(frameSeed + 1) * 4)
          ];

          drawingContext.save();
          drawingContext.globalCompositeOperation = "source-over";
          drawingContext.globalAlpha = seededRange(frameSeed + 2, 0.18, 0.62);
          drawingContext.strokeStyle = color || "rgba(168,162,158,0.54)";
          drawingContext.lineWidth = Math.max(1, Math.round(Math.min(width, height) * 0.001));
          drawingContext.strokeRect(
            width * seededRange(frameSeed + 3, 0.04, 0.82),
            height * seededRange(frameSeed + 4, 0.06, 0.78),
            width * seededRange(frameSeed + 5, 0.08, isPortrait ? 0.42 : 0.26),
            height * seededRange(frameSeed + 6, 0.06, isPortrait ? 0.22 : 0.32)
          );
          drawingContext.restore();
        }

        const centralIndex = Math.floor(seconds / 7) % centralPool.length;
        const centralText = mutateText(
          centralPool[centralIndex]?.toUpperCase() || fallbackCentral[0],
          seed + centralIndex * 97,
          tick,
          0.16
        );
        const centralFontSize = Math.round(
          isPortrait ? Math.min(width * 0.13, height * 0.06) : Math.min(width * 0.075, height * 0.14)
        );

        drawingContext.save();
        drawingContext.globalCompositeOperation = "source-over";
        drawingContext.globalAlpha = 1;
        drawingContext.textAlign = "center";
        drawingContext.textBaseline = "middle";
        drawingContext.font = `700 ${centralFontSize}px "OCR A Std", "Arial Narrow", "Courier New", monospace`;
        drawingContext.fillStyle = "rgb(245, 245, 244)";
        const centralLines = wrapText(drawingContext, centralText, width * (isPortrait ? 0.84 : 0.72));
        const lineHeight = centralFontSize * 0.76;
        const centerY = height * (isPortrait ? 0.48 : 0.5);
        centralLines.forEach((line, index) => {
          drawingContext.fillText(
            line,
            width / 2,
            centerY + (index - (centralLines.length - 1) / 2) * lineHeight,
            width * 1.18
          );
        });
        drawingContext.restore();

        const titleIndex = Math.floor(seconds / 6) % Math.max(1, titlePool.length);
        const title = titlePool[titleIndex] || "current association";
        const remaining = Math.max(0, 6 - (seconds % 6));
        const secondsPart = Math.floor(remaining);
        const millisecondsPart = Math.floor((remaining - secondsPart) * 1000);
        const countdown = `${String(secondsPart).padStart(2, "0")}.${String(millisecondsPart).padStart(3, "0")}`;

        drawingContext.save();
        drawingContext.globalCompositeOperation = "source-over";
        drawingContext.textAlign = "left";
        drawingContext.textBaseline = "alphabetic";
        drawingContext.fillStyle = "rgb(245, 245, 244)";
        drawingContext.font = `700 ${Math.round(Math.min(width, height) * 0.035)}px "Courier New", monospace`;
        drawingContext.fillText(countdown, width * 0.045, height * (isPortrait ? 0.82 : 0.77));
        drawingContext.font = `${Math.round(Math.min(width, height) * 0.055)}px Georgia, serif`;
        drawingContext.fillText(title, width * 0.045, height * (isPortrait ? 0.87 : 0.84), width * 0.58);
        if (captionText) {
          drawingContext.font = `${Math.round(Math.min(width, height) * 0.014)}px Georgia, serif`;
          drawingContext.fillStyle = "rgba(168, 162, 158, 0.72)";
          wrapText(drawingContext, captionText, width * 0.42).slice(0, 2).forEach((line, index) => {
            drawingContext.fillText(line, width * 0.045, height * (isPortrait ? 0.9 : 0.88) + index * Math.round(height * 0.025));
          });
        }
        drawingContext.restore();

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
  }, [
    captionText,
    captionTitles,
    catalogSignals,
    centralTexts,
    height,
    images,
    onComplete,
    onError,
    seed,
    textures,
    width,
  ]);

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
