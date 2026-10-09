"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The hero's looping footage, shown only once it is actually playing.
 *
 * It sits over the hero photograph and stays transparent until the first
 * `playing` event, so a video that fails to load, an autoplay the browser
 * blocks (iOS Low Power Mode, data saver) or a reduced-motion preference all
 * leave the photograph in place instead of a blank or frozen frame.
 */
export function HeroVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    // Autoplay needs `muted` as a property, which server-rendered markup
    // doesn't always carry through hydration — set it, then ask to play.
    video.muted = true;
    if (!video.paused && video.readyState > 2) setPlaying(true);
    else video.play().catch(() => {});
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      onPlaying={() => setPlaying(true)}
      onError={() => setPlaying(false)}
      className={cn(
        "object-cover transition-opacity duration-700 motion-reduce:hidden",
        playing ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
