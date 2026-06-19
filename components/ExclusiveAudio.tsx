"use client";

import type { AudioHTMLAttributes } from "react";

type ExclusiveAudioProps = AudioHTMLAttributes<HTMLAudioElement>;

export default function ExclusiveAudio(props: ExclusiveAudioProps) {
  return (
    <audio
      {...props}
      data-exclusive-audio="artifact"
      onPlay={(event) => {
        props.onPlay?.(event);

        document
          .querySelectorAll<HTMLAudioElement>('audio[data-exclusive-audio="artifact"]')
          .forEach((audio) => {
            if (audio !== event.currentTarget) audio.pause();
          });
      }}
    />
  );
}
