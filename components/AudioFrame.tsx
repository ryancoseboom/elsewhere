"use client";

import { useEffect, useState } from "react";
import ExclusiveAudio from "@/components/ExclusiveAudio";

type AudioFrameProps = {
  audioUrl: string;
  imageUrl?: string | null;
};

function fallbackColor() {
  return "rgb(41, 37, 36)";
}

export default function AudioFrame({ audioUrl, imageUrl }: AudioFrameProps) {
  const [frameColor, setFrameColor] = useState(fallbackColor());

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.width = 40;
        canvas.height = 40;

        context.drawImage(img, 0, 0, 40, 40);

        const { data } = context.getImageData(0, 0, 40, 40);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 16) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const alpha = data[i + 3];

          if (alpha < 128) continue;

          r += red;
          g += green;
          b += blue;
          count++;
        }

        if (!count) return;

        r = Math.floor((r / count) * 0.85);
        g = Math.floor((g / count) * 0.85);
        b = Math.floor((b / count) * 0.85);

        setFrameColor(`rgb(${r}, ${g}, ${b})`);
      } catch {
        setFrameColor(fallbackColor());
      }
    };
  }, [imageUrl]);

  return (
    <div
      className="mt-6 max-w-2xl border border-stone-800 p-4"
      style={{ backgroundColor: frameColor }}
    >
      <ExclusiveAudio controls src={audioUrl} className="w-full opacity-90" />
    </div>
  );
}
