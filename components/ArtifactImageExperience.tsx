"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type TouchEvent,
} from "react";
import FloatRecorder, { type FloatRecording } from "./FloatRecorder";
import { ARCHIVE_TEXTURES, archiveTextureSet } from "@/lib/archive-textures";
import { spotifyUrl as normalizeSpotifyUrl } from "@/lib/spotify";

type ExperienceImage = {
  src: string;
  alt: string;
  category?: string;
  slug?: string;
};

type LightboxState = {
  image: ExperienceImage;
  routeKey: string;
};

type ArtifactImageButtonProps = ExperienceImage & {
  alwaysColor?: boolean;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
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
const closeImageEvent = "elsewhere:close-image";
const recordingDimensions: RecordingDimensions[] = [
  { height: 1080, label: "Landscape / 1920 x 1080", width: 1920 },
  { height: 1920, label: "Portrait / 1080 x 1920", width: 1080 },
];
const floatTextures = ARCHIVE_TEXTURES;
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
    `${seededRange(seed + 1, -1, 6).toFixed(1)}% ${seededRange(seed + 2, -1, 5).toFixed(1)}%`,
    `${seededRange(seed + 3, 12, 20).toFixed(1)}% ${seededRange(seed + 4, 0, 9).toFixed(1)}%`,
    `${seededRange(seed + 5, 24, 34).toFixed(1)}% ${seededRange(seed + 6, -2, 4).toFixed(1)}%`,
    `${seededRange(seed + 7, 42, 51).toFixed(1)}% ${seededRange(seed + 8, 1, 12).toFixed(1)}%`,
    `${seededRange(seed + 9, 58, 68).toFixed(1)}% ${seededRange(seed + 10, -1, 5).toFixed(1)}%`,
    `${seededRange(seed + 11, 79, 88).toFixed(1)}% ${seededRange(seed + 12, 0, 10).toFixed(1)}%`,
    `${seededRange(seed + 13, 96, 101).toFixed(1)}% ${seededRange(seed + 14, -1, 6).toFixed(1)}%`,
    `${seededRange(seed + 15, 91, 100).toFixed(1)}% ${seededRange(seed + 16, 15, 25).toFixed(1)}%`,
    `${seededRange(seed + 17, 97, 101).toFixed(1)}% ${seededRange(seed + 18, 34, 45).toFixed(1)}%`,
    `${seededRange(seed + 19, 90, 100).toFixed(1)}% ${seededRange(seed + 20, 54, 64).toFixed(1)}%`,
    `${seededRange(seed + 21, 96, 101).toFixed(1)}% ${seededRange(seed + 22, 76, 86).toFixed(1)}%`,
    `${seededRange(seed + 23, 92, 100).toFixed(1)}% ${seededRange(seed + 24, 95, 101).toFixed(1)}%`,
    `${seededRange(seed + 25, 74, 84).toFixed(1)}% ${seededRange(seed + 26, 90, 101).toFixed(1)}%`,
    `${seededRange(seed + 27, 57, 68).toFixed(1)}% ${seededRange(seed + 28, 96, 101).toFixed(1)}%`,
    `${seededRange(seed + 29, 40, 50).toFixed(1)}% ${seededRange(seed + 30, 89, 100).toFixed(1)}%`,
    `${seededRange(seed + 31, 22, 32).toFixed(1)}% ${seededRange(seed + 32, 96, 101).toFixed(1)}%`,
    `${seededRange(seed + 33, 0, 12).toFixed(1)}% ${seededRange(seed + 34, 92, 100).toFixed(1)}%`,
    `${seededRange(seed + 35, -1, 7).toFixed(1)}% ${seededRange(seed + 36, 74, 86).toFixed(1)}%`,
    `${seededRange(seed + 37, 0, 10).toFixed(1)}% ${seededRange(seed + 38, 55, 66).toFixed(1)}%`,
    `${seededRange(seed + 39, -1, 6).toFixed(1)}% ${seededRange(seed + 40, 35, 46).toFixed(1)}%`,
    `${seededRange(seed + 41, 0, 11).toFixed(1)}% ${seededRange(seed + 42, 15, 26).toFixed(1)}%`,
  ];

  return `polygon(${points.join(", ")})`;
}

export function ArtifactImageButton({
  src,
  alt,
  category,
  alwaysColor = false,
  className = "",
  imageClassName = "",
  loading = "lazy",
}: ArtifactImageButtonProps) {
  const positioningClass = className.includes("absolute") ? "" : "relative";
  const overlayTextures = archiveTextureSet(`${src}:${alt}:${category || ""}`);

  return (
    <button
      type="button"
      aria-label={`Open ${alt}`}
      className={`${positioningClass} overflow-hidden ${className}`}
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent<ExperienceImage>(openImageEvent, {
            detail: { src, alt, category },
          })
        );
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
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
        <span
          aria-hidden
          className="elsewhere-archive-texture absolute inset-0"
          style={{
            backgroundImage: overlayTextures
              .map((texture) => `url(${texture})`)
              .join(", "),
          }}
        />
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
  const maskTexture = textures[Math.floor(seededUnit(seed + 61) * textures.length)];
  const edgeTexture = textures[Math.floor(seededUnit(seed + 67) * textures.length)];

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
        "--float-edge-rotation": `${seededRange(seed + 25, -3.4, 3.4).toFixed(2)}deg`,
        "--float-texture-delay": `${-seededRange(seed + 26, 0, 8).toFixed(2)}s`,
        "--float-texture-duration": `${seededRange(seed + 27, 2.8, 7).toFixed(2)}s`,
        "--float-edge-opacity": seededRange(seed + 31, 0.04, 0.28).toFixed(3),
        "--float-edge-texture": `url(${edgeTexture})`,
        "--float-frame-shadow": seededRange(seed + 32, 0.2, 0.7).toFixed(3),
        "--float-tile-mask": `url(${maskTexture})`,
        "--float-texture-opacity": seededRange(seed + 28, 0.08, 0.28).toFixed(3),
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
      {seededUnit(seed + 41) > 0.63 && (
        <span
          aria-hidden
          className="elsewhere-float-tape absolute"
          style={{
            left: `${seededRange(seed + 42, 4, 72).toFixed(1)}%`,
            top: `${seededRange(seed + 43, -3, 7).toFixed(1)}%`,
            transform: `rotate(${seededRange(seed + 44, -10, 10).toFixed(2)}deg)`,
            width: `${seededRange(seed + 45, 18, 42).toFixed(1)}%`,
          }}
        />
      )}
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

function FloatPaperScrap({
  index,
  seed,
  textures,
}: {
  index: number;
  seed: number;
  textures: string[];
}) {
  const texture = textures[Math.floor(seededUnit(seed + 1) * textures.length)];

  return (
    <span
      aria-hidden
      className="elsewhere-float-paper-scrap absolute"
      style={{
        backgroundImage: `url(${texture})`,
        height: `${seededRange(seed + 2, 16, 62).toFixed(1)}%`,
        left: `${seededRange(seed + 3, -14, 92).toFixed(1)}%`,
        opacity: seededRange(seed + 4, 0.1, 0.34).toFixed(3),
        top: `${seededRange(seed + 5, -16, 88).toFixed(1)}%`,
        transform: `rotate(${seededRange(seed + 6, -8, 8).toFixed(2)}deg)`,
        width: `${seededRange(seed + 7, 10, 46).toFixed(1)}%`,
        "--float-paper-delay": `${-seededRange(seed + 8, 0, 22).toFixed(2)}s`,
        "--float-paper-duration": `${seededRange(seed + 9, 16, 36).toFixed(2)}s`,
        "--float-paper-x": `${seededRange(seed + 10, -2.4, 2.4).toFixed(2)}%`,
        "--float-paper-y": `${seededRange(seed + 11, -2.4, 2.4).toFixed(2)}%`,
      } as CSSProperties}
    >
      {index % 4 === 0 && (
        <span className="absolute bottom-3 left-4 font-mono text-[9px] tracking-[0.42em] text-stone-300/30">
          {String(index + 1).padStart(2, "0")} / FLOAT
        </span>
      )}
    </span>
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
  initialImageSlug,
  returnHref,
  showTrigger = true,
  spotifyUrl,
}: {
  autoLaunch?: boolean;
  images: ExperienceImage[];
  initialImageSlug?: string;
  returnHref?: string;
  showTrigger?: boolean;
  spotifyUrl?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const routeKey = `${pathname}?${searchParamString}`;
  const [lightboxState, setLightboxState] = useState<LightboxState | null>(
    () => {
      const initialImage = initialImageSlug
        ? images.find((image) => image.slug === initialImageSlug)
        : undefined;
      return initialImage ? { image: initialImage, routeKey } : null;
    }
  );
  const lightboxImage =
    lightboxState?.routeKey === routeKey ? lightboxState.image : null;
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
  const lightboxOpen = Boolean(lightboxImage);
  const floatRef = useRef<HTMLDivElement>(null);
  const closeLightboxRef = useRef<HTMLButtonElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const lightboxImages = useMemo(() => {
    const uniqueImages = new Map(images.map((image) => [image.src, image]));

    if (lightboxImage && !uniqueImages.has(lightboxImage.src)) {
      return [lightboxImage, ...uniqueImages.values()];
    }

    return [...uniqueImages.values()];
  }, [images, lightboxImage]);

  const moveLightbox = useCallback(
    (offset: number) => {
      if (!lightboxImage || lightboxImages.length < 2) return;

      const currentIndex = lightboxImages.findIndex(
        (image) => image.src === lightboxImage.src
      );
      if (currentIndex < 0) return;

      const nextIndex =
        (currentIndex + offset + lightboxImages.length) % lightboxImages.length;
      setLightboxState({ image: lightboxImages[nextIndex], routeKey });
    },
    [lightboxImage, lightboxImages, routeKey]
  );

  const closeLightbox = useCallback(() => {
    setLightboxState(null);
    window.setTimeout(() => previousActiveElementRef.current?.focus(), 0);
  }, []);

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
      previousActiveElementRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setLightboxState({
        image: (event as CustomEvent<ExperienceImage>).detail,
        routeKey,
      });
    }

    function closeImage() {
      setLightboxState(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (lightboxImage && event.key === "Tab") {
        const focusableElements = lightboxRef.current?.querySelectorAll<
          HTMLAnchorElement | HTMLButtonElement
        >("a[href], button:not([disabled])");
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
        return;
      }

      if (lightboxImage && event.key === "ArrowLeft") {
        event.preventDefault();
        moveLightbox(-1);
        return;
      }

      if (lightboxImage && event.key === "ArrowRight") {
        event.preventDefault();
        moveLightbox(1);
        return;
      }

      if (event.key !== "Escape") return;

      closeLightbox();
      setFloating(false);
    }

    window.addEventListener(openImageEvent, openImage);
    window.addEventListener(closeImageEvent, closeImage);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener(openImageEvent, openImage);
      window.removeEventListener(closeImageEvent, closeImage);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeLightbox, lightboxImage, moveLightbox, routeKey]);

  useEffect(() => {
    if (new URLSearchParams(searchParamString).has("image")) return;

    window.dispatchEvent(new Event(closeImageEvent));
  }, [pathname, searchParamString]);

  useEffect(() => {
    if (!lightboxOpen) return;
    closeLightboxRef.current?.focus();
  }, [lightboxOpen]);

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
  const paperScraps = Array.from({ length: 12 }, (_, index) => ({
    index,
    key: `paper-${floatSeed}-${index}`,
    seed: floatSeed + index * 59 + 3401,
  }));
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
          ref={lightboxRef}
          role="dialog"
          aria-label="Image viewer"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 px-5 pb-32 pt-16 backdrop-blur-sm md:px-16 md:pb-44 md:pt-20"
          onClick={closeLightbox}
          onTouchStart={(event: TouchEvent<HTMLDivElement>) => {
            touchStartXRef.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event: TouchEvent<HTMLDivElement>) => {
            const touchStartX = touchStartXRef.current;
            const touchEndX = event.changedTouches[0]?.clientX;
            touchStartXRef.current = null;

            if (touchStartX === null || touchEndX === undefined) return;
            if (Math.abs(touchEndX - touchStartX) < 48) return;

            moveLightbox(touchEndX > touchStartX ? -1 : 1);
          }}
        >
          <button
            ref={closeLightboxRef}
            type="button"
            className="absolute right-5 top-5 border border-stone-700 bg-black/70 px-3 py-2 text-xs uppercase tracking-[0.25em] text-stone-300 transition hover:border-stone-400 hover:text-white"
            onClick={closeLightbox}
          >
            Close
          </button>
          {lightboxImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 border border-stone-700 bg-black/70 px-4 py-3 text-2xl text-stone-300 transition hover:border-stone-400 hover:text-white md:left-7"
                onClick={(event) => {
                  event.stopPropagation();
                  moveLightbox(-1);
                }}
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next image"
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 border border-stone-700 bg-black/70 px-4 py-3 text-2xl text-stone-300 transition hover:border-stone-400 hover:text-white md:right-7"
                onClick={(event) => {
                  event.stopPropagation();
                  moveLightbox(1);
                }}
              >
                →
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <div
            className="absolute inset-x-5 bottom-5 md:inset-x-16"
            onClick={(event) => event.stopPropagation()}
          >
            {lightboxImages.length > 1 && (
              <div className="mb-4 hidden max-w-full gap-2 overflow-x-auto pb-1 md:flex">
                {lightboxImages.map((image, index) => (
                  <button
                    key={`${image.src}-${index}`}
                    type="button"
                    aria-label={`Open image ${index + 1} of ${lightboxImages.length}`}
                    aria-current={image.src === lightboxImage.src ? "true" : undefined}
                    className={`h-14 w-14 shrink-0 overflow-hidden border bg-stone-950 transition ${
                      image.src === lightboxImage.src
                        ? "border-stone-200 opacity-100"
                        : "border-stone-700 opacity-55 hover:border-stone-400 hover:opacity-100"
                    }`}
                    onClick={() => setLightboxState({ image, routeKey })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-stone-800 pt-3">
              <div>
                {lightboxImage.category && (
                  <p className="text-[9px] uppercase tracking-[0.22em] text-stone-600">
                    {lightboxImage.category}
                  </p>
                )}
                <p className="mt-1 max-w-3xl font-serif text-sm text-stone-300">
                  {lightboxImage.alt}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.2em] text-stone-500">
                <span>
                  {Math.max(
                    1,
                    lightboxImages.findIndex(
                      (image) => image.src === lightboxImage.src
                    ) + 1
                  )}{" "}
                  / {lightboxImages.length}
                </span>
                <a
                  href={lightboxImage.src}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-white"
                >
                  View original ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {floating && (
        <div
          ref={floatRef}
          className={`elsewhere-float-stage fixed inset-0 z-[80] overflow-hidden bg-black ${
            pageHidden ? "elsewhere-float-paused" : ""
          }`}
          onPointerMove={moveFloat}
          onPointerLeave={resetFloatPointer}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(68,64,60,0.18),transparent_65%)]" />
          <div className="elsewhere-float-paper-field absolute inset-0">
            {paperScraps.map((scrap) => (
              <FloatPaperScrap
                key={scrap.key}
                index={scrap.index}
                seed={scrap.seed}
                textures={sessionTextures}
              />
            ))}
          </div>
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
                onOpen={(image) => setLightboxState({ image, routeKey })}
                seed={tile.seed}
                style={tile.style}
                textures={sessionTextures}
              />
            ))}
          </div>
          <div aria-hidden className="elsewhere-float-analog-overlay absolute inset-0" />
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
