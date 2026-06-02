"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import FloatRecorder, { type FloatRecording } from "./FloatRecorder";
import { spotifyUrl as normalizeSpotifyUrl } from "@/lib/spotify";

type ExperienceImage = {
  src: string;
  alt: string;
};

type ArtifactImageButtonProps = ExperienceImage & {
  alwaysColor?: boolean;
  className?: string;
  imageClassName?: string;
};

type RecordingDimensions = {
  height: number;
  label: string;
  width: number;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: {
      accept: Record<string, string[]>;
      description: string;
    }[];
  }) => Promise<{
    createWritable: () => Promise<{
      close: () => Promise<void>;
      write: (data: Blob) => Promise<void>;
    }>;
  }>;
};

const openImageEvent = "elsewhere:open-image";
const recordingDimensions: RecordingDimensions[] = [
  { height: 1080, label: "Landscape / 1920 x 1080", width: 1920 },
  { height: 1920, label: "Portrait / 1080 x 1920", width: 1080 },
];
const floatTextures = [
  "/textures/float/black-scratches.jpg",
  "/textures/float/blur-grunge.jpg",
  "/textures/float/dust-scratches.jpg",
  "/textures/float/fingerprint-smudge.jpg",
  "/textures/float/flare-noise.jpg",
  "/textures/float/folded-paper.jpg",
  "/textures/float/halftone-noise.jpg",
  "/textures/float/photocopy-noise.jpg",
  "/textures/float/masking-tape.jpg",
  "/textures/float/rip-noise.jpg",
  "/textures/float/scrape.jpg",
  "/textures/float/text-noise.jpg",
  "/textures/float/vhs-noise.jpg",
];
const floatTextureCount = 7;

function seededUnit(seed: number) {
  const value = Math.sin(seed * 9187.17) * 10000;
  return value - Math.floor(value);
}

function seededRange(seed: number, minimum: number, maximum: number) {
  return minimum + seededUnit(seed) * (maximum - minimum);
}

function floatTileSpan(seed: number, maximum: number) {
  const size = seededUnit(seed);

  if (size < 0.28) return 1;
  if (size < 0.56) return 2;
  if (size < 0.76) return 3;
  if (size < 0.9) return 4;

  return Math.floor(seededRange(seed + 1, 5, maximum + 1));
}

function selectFloatTextures(seed: number) {
  return [...floatTextures]
    .sort((left, right) => {
      const leftScore = seededUnit(seed + floatTextures.indexOf(left) * 17);
      const rightScore = seededUnit(seed + floatTextures.indexOf(right) * 17);

      return leftScore - rightScore;
    })
    .slice(0, floatTextureCount);
}

function clusteredSwapDelay(seed: number, minimum: number, maximum: number) {
  const clusters = [0.18, 0.43, 0.72, 0.94];
  const cluster = clusters[Math.floor(seededUnit(seed) * clusters.length)];
  const jitter = seededRange(seed + 1, -0.07, 0.07);

  return minimum + Math.max(0, Math.min(1, cluster + jitter)) * (maximum - minimum);
}

function organicClipPath(seed: number) {
  const points = [
    `${seededRange(seed + 1, 0, 5).toFixed(1)}% ${seededRange(seed + 2, 0, 4).toFixed(1)}%`,
    `${seededRange(seed + 3, 28, 38).toFixed(1)}% ${seededRange(seed + 4, 0, 3).toFixed(1)}%`,
    `${seededRange(seed + 5, 63, 73).toFixed(1)}% ${seededRange(seed + 6, 0, 4).toFixed(1)}%`,
    `${seededRange(seed + 7, 96, 100).toFixed(1)}% ${seededRange(seed + 8, 0, 5).toFixed(1)}%`,
    `${seededRange(seed + 9, 96, 100).toFixed(1)}% ${seededRange(seed + 10, 29, 40).toFixed(1)}%`,
    `${seededRange(seed + 11, 96, 100).toFixed(1)}% ${seededRange(seed + 12, 64, 75).toFixed(1)}%`,
    `${seededRange(seed + 13, 95, 100).toFixed(1)}% ${seededRange(seed + 14, 96, 100).toFixed(1)}%`,
    `${seededRange(seed + 15, 62, 74).toFixed(1)}% ${seededRange(seed + 16, 96, 100).toFixed(1)}%`,
    `${seededRange(seed + 17, 27, 39).toFixed(1)}% ${seededRange(seed + 18, 96, 100).toFixed(1)}%`,
    `${seededRange(seed + 19, 0, 5).toFixed(1)}% ${seededRange(seed + 20, 95, 100).toFixed(1)}%`,
    `${seededRange(seed + 21, 0, 4).toFixed(1)}% ${seededRange(seed + 22, 62, 75).toFixed(1)}%`,
    `${seededRange(seed + 23, 0, 4).toFixed(1)}% ${seededRange(seed + 24, 27, 40).toFixed(1)}%`,
  ];

  return `polygon(${points.join(", ")})`;
}

export function ArtifactImageButton({
  src,
  alt,
  alwaysColor = false,
  className = "",
  imageClassName = "",
}: ArtifactImageButtonProps) {
  const positioningClass = className.includes("absolute") ? "" : "relative";

  return (
    <button
      type="button"
      aria-label={`Open ${alt}`}
      className={`${positioningClass} overflow-hidden ${className}`}
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent<ExperienceImage>(openImageEvent, {
            detail: { src, alt },
          })
        );
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={
          alwaysColor
            ? undefined
            : { filter: "grayscale(54%) saturate(72%) contrast(94%)" }
        }
        className={`transition duration-700 ${
          alwaysColor ? "" : "elsewhere-archive-image"
        } ${imageClassName}`}
      />
      {!alwaysColor && (
        <span aria-hidden className="elsewhere-archive-texture absolute inset-0" />
      )}
    </button>
  );
}

function FloatTile({
  images,
  initialImageIndex,
  onOpen,
  seed,
  style,
  textures,
}: {
  images: ExperienceImage[];
  initialImageIndex: number;
  onOpen: (image: ExperienceImage) => void;
  seed: number;
  style: CSSProperties;
  textures: string[];
}) {
  const [imageIndex, setImageIndex] = useState(initialImageIndex);
  const [visible, setVisible] = useState(true);
  const image = images[imageIndex];
  const texture = textures[Math.floor(seededUnit(seed + imageIndex) * textures.length)];

  useEffect(() => {
    if (images.length < 2) return;

    let fadeTimer: ReturnType<typeof setTimeout>;
    let swapTimer: ReturnType<typeof setTimeout>;
    let revealTimer: ReturnType<typeof setTimeout>;

    function scheduleSwap() {
      const visibleDuration = clusteredSwapDelay(seed + Date.now(), 7600, 17400);
      fadeTimer = setTimeout(() => {
        setVisible(false);
        swapTimer = setTimeout(() => {
          setImageIndex((currentIndex) => {
            const offset = 1 + Math.floor(Math.random() * (images.length - 1));
            return (currentIndex + offset) % images.length;
          });
          revealTimer = setTimeout(() => {
            setVisible(true);
            scheduleSwap();
          }, seededRange(seed + Date.now() + 1, 900, 1650));
        }, 2550);
      }, visibleDuration);
    }

    scheduleSwap();

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(swapTimer);
      clearTimeout(revealTimer);
    };
  }, [images.length, seed]);

  return (
    <button
      type="button"
      className="elsewhere-float-tile-frame relative overflow-hidden bg-stone-950"
      style={{
        ...style,
        clipPath: organicClipPath(seed),
        borderRadius: `${seededRange(seed + 11, 0, 14).toFixed(1)}px ${seededRange(seed + 12, 0, 18).toFixed(1)}px ${seededRange(seed + 13, 0, 12).toFixed(1)}px ${seededRange(seed + 14, 0, 16).toFixed(1)}px`,
        "--float-edge-rotation": `${seededRange(seed + 25, -0.75, 0.75).toFixed(2)}deg`,
        "--float-texture-delay": `${-seededRange(seed + 26, 0, 8).toFixed(2)}s`,
        "--float-texture-duration": `${seededRange(seed + 27, 2.8, 7).toFixed(2)}s`,
        "--float-edge-opacity": seededRange(seed + 31, 0, 0.15).toFixed(3),
        "--float-texture-opacity": seededRange(seed + 28, 0.05, 0.2).toFixed(3),
      } as CSSProperties}
      onClick={() => onOpen(image)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt}
        className="elsewhere-float-drift-image h-full w-full object-cover"
        style={{
          ...style,
          opacity: visible ? 1 : 0,
          transition: "opacity 2400ms ease-in-out",
        }}
      />
      <span
        aria-hidden
        className="elsewhere-float-texture absolute inset-0"
        style={{ backgroundImage: `url(${texture})` }}
      />
      <span
        aria-hidden
        className="elsewhere-float-edge absolute inset-0"
      />
    </button>
  );
}

function FloatTextureFragment({
  initialTextureIndex,
  seed,
  textures,
}: {
  initialTextureIndex: number;
  seed: number;
  textures: string[];
}) {
  const [textureIndex, setTextureIndex] = useState(initialTextureIndex);
  const [visible, setVisible] = useState(true);
  const [layoutSeed, setLayoutSeed] = useState(seed);
  const texture = textures[textureIndex];

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    let swapTimer: ReturnType<typeof setTimeout>;
    let revealTimer: ReturnType<typeof setTimeout>;

    function scheduleSwap() {
      fadeTimer = setTimeout(() => {
        setVisible(false);
        swapTimer = setTimeout(() => {
          setTextureIndex((currentIndex) => {
            const offset = 1 + Math.floor(Math.random() * (textures.length - 1));
            return (currentIndex + offset) % textures.length;
          });
          setLayoutSeed(Math.floor(Math.random() * 1_000_000));
          revealTimer = setTimeout(() => {
            setVisible(true);
            scheduleSwap();
          }, seededRange(seed + Date.now() + 1, 300, 750));
        }, 950);
      }, clusteredSwapDelay(seed + Date.now(), 2300, 7600));
    }

    scheduleSwap();

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(swapTimer);
      clearTimeout(revealTimer);
    };
  }, [seed, textures.length]);

  return (
    <div
      aria-hidden
      className="elsewhere-float-texture-fragment"
      style={{
        gridColumn: `${Math.floor(seededRange(layoutSeed + 1, 1, 9))} / span ${Math.floor(seededRange(layoutSeed + 2, 4, 11))}`,
        gridRow: `${Math.floor(seededRange(layoutSeed + 3, 1, 7))} / span ${Math.floor(seededRange(layoutSeed + 4, 3, 9))}`,
        opacity: visible ? 1 : 0,
      } as CSSProperties}
    >
      <span
        className="elsewhere-float-texture-surface absolute inset-0"
        style={{
          backgroundImage: `url(${texture})`,
          "--float-organic-delay": `${-seededRange(layoutSeed + 6, 0, 18).toFixed(2)}s`,
          "--float-organic-duration": `${seededRange(layoutSeed + 7, 3.2, 9).toFixed(2)}s`,
          "--float-organic-opacity": seededRange(layoutSeed + 5, 0.14, 0.48).toFixed(3),
          "--float-organic-x": `${seededRange(layoutSeed + 8, 0, 100).toFixed(1)}%`,
          "--float-organic-y": `${seededRange(layoutSeed + 9, 0, 100).toFixed(1)}%`,
          "--float-organic-size": `${seededRange(layoutSeed + 10, 85, 170).toFixed(1)}%`,
        } as CSSProperties}
      />
    </div>
  );
}

function FloatHeroInterruption({
  images,
  seed,
}: {
  images: ExperienceImage[];
  seed: number;
}) {
  const [imageIndex, setImageIndex] = useState(
    Math.floor(seededUnit(seed + 1) * images.length)
  );
  const [visible, setVisible] = useState(false);
  const [layoutSeed, setLayoutSeed] = useState(seed);

  useEffect(() => {
    let revealTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;

    function schedule() {
      revealTimer = setTimeout(() => {
        setLayoutSeed(Math.floor(Math.random() * 1_000_000));
        setImageIndex(Math.floor(Math.random() * images.length));
        setVisible(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          nextTimer = setTimeout(schedule, 2200);
        }, seededRange(seed + Date.now(), 3600, 6200));
      }, clusteredSwapDelay(seed + Date.now(), 12000, 25000));
    }

    schedule();

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [images.length, seed]);

  return (
    <div
      aria-hidden
      className="elsewhere-float-hero-interruption absolute"
      style={{
        height: `${seededRange(layoutSeed + 1, 46, 76).toFixed(1)}%`,
        left: `${seededRange(layoutSeed + 2, -12, 52).toFixed(1)}%`,
        opacity: visible ? seededRange(layoutSeed + 3, 0.3, 0.64) : 0,
        top: `${seededRange(layoutSeed + 4, -8, 48).toFixed(1)}%`,
        transform: `rotate(${seededRange(layoutSeed + 5, -2.8, 2.8).toFixed(2)}deg) scale(${visible ? "1.04" : "0.96"})`,
        width: `${seededRange(layoutSeed + 6, 42, 82).toFixed(1)}%`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[imageIndex].src}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function FloatImageFragment({
  images,
  initialImageIndex,
  seed,
}: {
  images: ExperienceImage[];
  initialImageIndex: number;
  seed: number;
}) {
  const [imageIndex, setImageIndex] = useState(initialImageIndex);
  const [visible, setVisible] = useState(true);
  const [layoutSeed, setLayoutSeed] = useState(seed);
  const image = images[imageIndex];

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    let swapTimer: ReturnType<typeof setTimeout>;
    let revealTimer: ReturnType<typeof setTimeout>;

    function scheduleSwap() {
      fadeTimer = setTimeout(() => {
        setVisible(false);
        swapTimer = setTimeout(() => {
          if (images.length > 1) {
            setImageIndex((currentIndex) => {
              const offset = 1 + Math.floor(Math.random() * (images.length - 1));
              return (currentIndex + offset) % images.length;
            });
          }
          setLayoutSeed(Math.floor(Math.random() * 1_000_000));
          revealTimer = setTimeout(() => {
            setVisible(true);
            scheduleSwap();
          }, seededRange(seed + Date.now() + 1, 700, 1400));
        }, 1450);
      }, seededRange(seed + Date.now(), 5200, 11800));
    }

    scheduleSwap();

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(swapTimer);
      clearTimeout(revealTimer);
    };
  }, [images.length, seed]);

  return (
    <div
      aria-hidden
      className="elsewhere-float-image-fragment"
      style={{
        gridColumn: `${Math.floor(seededRange(layoutSeed + 1, 1, 9))} / span ${Math.floor(seededRange(layoutSeed + 2, 5, 13))}`,
        gridRow: `${Math.floor(seededRange(layoutSeed + 3, 1, 7))} / span ${Math.floor(seededRange(layoutSeed + 4, 4, 10))}`,
        opacity: visible ? 1 : 0,
      } as CSSProperties}
    >
      <span
        className="elsewhere-float-image-surface absolute inset-0"
        style={{
          backgroundImage: `url(${image.src})`,
          "--float-image-delay": `${-seededRange(layoutSeed + 6, 0, 15).toFixed(2)}s`,
          "--float-image-duration": `${seededRange(layoutSeed + 7, 7, 16).toFixed(2)}s`,
          "--float-image-opacity": seededRange(layoutSeed + 5, 0.08, 0.3).toFixed(3),
          "--float-image-x": `${seededRange(layoutSeed + 8, 0, 100).toFixed(1)}%`,
          "--float-image-y": `${seededRange(layoutSeed + 9, 0, 100).toFixed(1)}%`,
          "--float-image-size": `${seededRange(layoutSeed + 10, 110, 220).toFixed(1)}%`,
        } as CSSProperties}
      />
    </div>
  );
}

export default function ArtifactImageExperience({
  autoLaunch = false,
  images,
  returnHref,
  showTrigger = true,
  spotifyUrl,
}: {
  autoLaunch?: boolean;
  images: ExperienceImage[];
  returnHref?: string;
  showTrigger?: boolean;
  spotifyUrl?: string | null;
}) {
  const [lightboxImage, setLightboxImage] = useState<ExperienceImage | null>(
    null
  );
  const [floating, setFloating] = useState(autoLaunch && images.length > 0);
  const [floatSeed, setFloatSeed] = useState(0);
  const [floatSetup, setFloatSetup] = useState<"record" | "dimensions" | null>(
    null
  );
  const [recording, setRecording] = useState<RecordingDimensions | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [savedRecording, setSavedRecording] = useState<FloatRecording | null>(
    null
  );
  const [recordingName, setRecordingName] = useState("elsewhere-float");
  const [pageHidden, setPageHidden] = useState(false);
  const floatRef = useRef<HTMLDivElement>(null);

  const launchFloat = useCallback(() => {
    setFloatSeed(Math.floor(Math.random() * 1_000_000));
    setFloatSetup(null);
    setFloating(true);
  }, []);

  const completeRecording = useCallback((completedRecording: FloatRecording) => {
    setRecording(null);
    setFloating(false);
    setSavedRecording(completedRecording);
  }, []);

  const failRecording = useCallback((message: string) => {
    setRecording(null);
    setFloating(false);
    setRecordingError(message);
  }, []);

  async function saveRecording() {
    if (!savedRecording) return;

    const filename = `${recordingName.trim() || "elsewhere-float"}.${
      savedRecording.extension
    }`;
    const picker = (window as SaveFilePickerWindow).showSaveFilePicker;

    if (picker) {
      try {
        const handle = await picker({
          suggestedName: filename,
          types: [
            {
              accept: {
                [savedRecording.mimeType || `video/${savedRecording.extension}`]: [
                  `.${savedRecording.extension}`,
                ],
              },
              description: `${savedRecording.extension.toUpperCase()} video`,
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(savedRecording.blob);
        await writable.close();
        setSavedRecording(null);
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(savedRecording.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setSavedRecording(null);
  }

  useEffect(() => {
    function openImage(event: Event) {
      setLightboxImage((event as CustomEvent<ExperienceImage>).detail);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setLightboxImage(null);
      setFloating(false);
    }

    window.addEventListener(openImageEvent, openImage);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener(openImageEvent, openImage);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!floating && !lightboxImage) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [floating, lightboxImage]);

  useEffect(() => {
    function updateVisibility() {
      setPageHidden(document.hidden);
    }

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);

    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  function moveFloat(event: PointerEvent<HTMLDivElement>) {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;

    floatRef.current?.style.setProperty("--float-pointer-x", `${(x * 12).toFixed(2)}px`);
    floatRef.current?.style.setProperty("--float-pointer-y", `${(y * 10).toFixed(2)}px`);
  }

  function resetFloatPointer() {
    floatRef.current?.style.setProperty("--float-pointer-x", "0px");
    floatRef.current?.style.setProperty("--float-pointer-y", "0px");
  }

  const sessionTextures = useMemo(
    () => selectFloatTextures(floatSeed),
    [floatSeed]
  );
  const streamUrl = spotifyUrl ? normalizeSpotifyUrl(spotifyUrl) : "";
  const tiles =
    images.length > 0
      ? Array.from({ length: 24 }, (_, index) => {
            const seed = floatSeed + index * 7 + 101;
            const initialImageIndex = Math.floor(
              seededUnit(seed + 8) * images.length
            );

            const extreme = seededUnit(seed + 32);

            return {
              key: `tile-${index}`,
              seed,
              initialImageIndex,
              style: {
                "--float-column-delay": `${-seededRange(seed + 1, 1, 18).toFixed(2)}s`,
                "--float-column-duration": `${seededRange(seed + 2, 24, 46).toFixed(2)}s`,
                "--float-column-from": `${seededRange(seed + 3, -20, -5).toFixed(2)}%`,
                "--float-column-mid": `${seededRange(seed + 4, -4, 12).toFixed(2)}%`,
                "--float-column-to": `${seededRange(seed + 5, 10, 28).toFixed(2)}%`,
                "--float-column-opacity": seededRange(seed + 6, 0.28, 0.7).toFixed(2),
                "--float-column-scale": seededRange(seed + 7, 1.12, 1.54).toFixed(2),
                "--float-column-span": `${
                  extreme < 0.12 ? 1 : extreme > 0.9 ? 7 : floatTileSpan(seed + 29, 8)
                }`,
                "--float-overlap-scale": seededRange(seed + 34, 0.98, 1.2).toFixed(3),
                "--float-overlap-x": `${seededRange(seed + 35, -7, 7).toFixed(2)}%`,
                "--float-overlap-y": `${seededRange(seed + 36, -7, 7).toFixed(2)}%`,
                "--float-row-span": `${
                  extreme < 0.12 ? 6 : extreme > 0.9 ? 1 : floatTileSpan(seed + 30, 7)
                }`,
                "--float-tile-play-state":
                  seededUnit(seed + 37) < 0.12 ? "paused" : "running",
              } as CSSProperties,
            };
          }).filter((_, index) => seededUnit(floatSeed + index * 13 + 411) > 0.18)
      : [];
  const organicLayers = Array.from({ length: 7 }, (_, index) => {
    const seed = floatSeed + index * 31 + 701;

    return {
      key: `organic-${floatSeed}-${index}`,
      seed,
      initialTextureIndex: Math.floor(seededUnit(seed) * sessionTextures.length),
    };
  });
  const imageLayers = Array.from({ length: 3 }, (_, index) => {
    const seed = floatSeed + index * 47 + 1701;

    return {
      key: `image-layer-${floatSeed}-${index}`,
      seed,
      initialImageIndex: Math.floor(seededUnit(seed) * images.length),
    };
  });
  return (
    <>
      {showTrigger && (images.length > 0 || streamUrl) && (
        <div className="flex flex-wrap gap-3">
          {images.length > 0 && (
            <button
              type="button"
              className="border border-stone-700 px-4 py-2 text-[10px] uppercase tracking-[0.4em] text-stone-400 transition hover:border-stone-400 hover:bg-stone-900 hover:text-stone-100"
              onClick={() => setFloatSetup("record")}
            >
              Float
            </button>
          )}
          {streamUrl && (
            <a
              href={streamUrl}
              target="_blank"
              rel="noreferrer"
              className="border border-[#315d39] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-[#82b98b] transition hover:border-[#78b183] hover:bg-[#132218] hover:text-[#b9e1bf]"
            >
              Stream on Spotify
            </a>
          )}
        </div>
      )}

      {floatSetup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-stone-700 bg-[#11100e] p-6 text-stone-300 shadow-2xl">
            {floatSetup === "record" ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.42em] text-stone-500">
                  Float / visual transmission
                </p>
                <h2 className="mt-5 font-serif text-3xl text-stone-100">
                  Would you like to record this FLOAT?
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">
                  A recording captures the first 30 seconds without interface
                  labels or buttons.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="border border-stone-500 px-5 py-3 text-[10px] uppercase tracking-[0.32em] text-stone-100 transition hover:bg-stone-800"
                    onClick={() => setFloatSetup("dimensions")}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className="border border-stone-700 px-5 py-3 text-[10px] uppercase tracking-[0.32em] text-stone-400 transition hover:border-stone-500 hover:text-stone-100"
                    onClick={launchFloat}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className="px-3 py-3 text-[10px] uppercase tracking-[0.32em] text-stone-600 transition hover:text-stone-300"
                    onClick={() => setFloatSetup(null)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.42em] text-stone-500">
                  Record FLOAT
                </p>
                <h2 className="mt-5 font-serif text-3xl text-stone-100">
                  Choose the recording format
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">
                  Recording begins immediately after you select an orientation.
                </p>
                <div className="mt-7 grid gap-3">
                  {recordingDimensions.map((dimensions) => (
                    <button
                      key={dimensions.label}
                      type="button"
                      className="border border-stone-700 px-5 py-4 text-left text-[10px] uppercase tracking-[0.3em] text-stone-300 transition hover:border-stone-400 hover:bg-stone-900 hover:text-white"
                      onClick={() => {
                        setFloatSeed(Math.floor(Math.random() * 1_000_000));
                        setRecording(dimensions);
                        setFloatSetup(null);
                        setFloating(true);
                      }}
                    >
                      {dimensions.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-5 text-[10px] uppercase tracking-[0.32em] text-stone-600 transition hover:text-stone-300"
                  onClick={() => setFloatSetup("record")}
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {savedRecording && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-stone-700 bg-[#11100e] p-6 text-stone-300 shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.42em] text-stone-500">
              FLOAT recorded
            </p>
            <h2 className="mt-5 font-serif text-3xl text-stone-100">
              Save the 30-second transmission
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              {savedRecording.extension === "mp4"
                ? "Your browser created an MP4 file."
                : "This browser records FLOAT as WebM rather than MP4."}
            </p>
            <label className="mt-6 block text-[10px] uppercase tracking-[0.3em] text-stone-500">
              File name
              <input
                className="mt-3 w-full border border-stone-700 bg-black px-3 py-3 text-sm normal-case tracking-normal text-stone-200 outline-none transition focus:border-stone-400"
                value={recordingName}
                onChange={(event) => setRecordingName(event.target.value)}
              />
            </label>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                className="border border-stone-500 px-5 py-3 text-[10px] uppercase tracking-[0.32em] text-stone-100 transition hover:bg-stone-800"
                onClick={saveRecording}
              >
                Choose save location
              </button>
              <button
                type="button"
                className="px-3 py-3 text-[10px] uppercase tracking-[0.32em] text-stone-600 transition hover:text-stone-300"
                onClick={() => setSavedRecording(null)}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {recordingError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-stone-700 bg-[#11100e] p-6 text-stone-300 shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.42em] text-stone-500">
              FLOAT recording unavailable
            </p>
            <p className="mt-5 text-sm leading-6 text-stone-300">
              {recordingError}
            </p>
            <button
              type="button"
              className="mt-7 border border-stone-700 px-5 py-3 text-[10px] uppercase tracking-[0.32em] text-stone-300 transition hover:border-stone-400 hover:text-white"
              onClick={() => setRecordingError(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          role="presentation"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-5 backdrop-blur-sm md:p-12"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 border border-stone-700 bg-black/70 px-3 py-2 text-xs uppercase tracking-[0.25em] text-stone-300 transition hover:border-stone-400 hover:text-white"
            onClick={() => setLightboxImage(null)}
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {floating && (
        <div
          ref={floatRef}
          className={`fixed inset-0 z-[80] overflow-hidden bg-black ${
            pageHidden ? "elsewhere-float-paused" : ""
          }`}
          onPointerMove={moveFloat}
          onPointerLeave={resetFloatPointer}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(68,64,60,0.18),transparent_65%)]" />
          <div className="elsewhere-float-texture-mosaic absolute inset-0 grid">
            {organicLayers.map((layer) => (
              <FloatTextureFragment
                key={layer.key}
                initialTextureIndex={layer.initialTextureIndex}
                seed={layer.seed}
                textures={sessionTextures}
              />
            ))}
          </div>
          <div className="elsewhere-float-image-mosaic absolute inset-0 grid">
            {imageLayers.map((layer) => (
              <FloatImageFragment
                key={layer.key}
                images={images}
                initialImageIndex={layer.initialImageIndex}
                seed={layer.seed}
              />
            ))}
          </div>
          <FloatHeroInterruption images={images} seed={floatSeed + 2901} />
          <div className="elsewhere-float-mosaic absolute inset-0 grid gap-2 p-2">
            {tiles.map((tile) => (
              <FloatTile
                key={tile.key}
                images={images}
                initialImageIndex={tile.initialImageIndex}
                onOpen={setLightboxImage}
                seed={tile.seed}
                style={tile.style}
                textures={sessionTextures}
              />
            ))}
          </div>
          {recording ? (
            <FloatRecorder
              height={recording.height}
              images={images}
              seed={floatSeed}
              textures={sessionTextures}
              width={recording.width}
              onComplete={completeRecording}
              onError={failRecording}
            />
          ) : (
            <>
              <div className="absolute left-5 top-5 z-30 text-[10px] uppercase tracking-[0.42em] text-stone-500">
                Float / visual transmission
              </div>
              {returnHref ? (
                <a
                  href={returnHref}
                  className="absolute right-5 top-5 z-30 border border-stone-700 bg-black/60 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-stone-300 transition hover:border-stone-400 hover:text-white"
                >
                  Return
                </a>
              ) : (
                <button
                  type="button"
                  className="absolute right-5 top-5 z-30 border border-stone-700 bg-black/60 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-stone-300 transition hover:border-stone-400 hover:text-white"
                  onClick={() => setFloating(false)}
                >
                  Return
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
