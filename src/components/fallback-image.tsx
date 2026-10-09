"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * An <img> that quietly swaps to `fallback` when the file doesn't exist (yet). Also catches
 * images that failed before hydration (complete but zero-sized), which onError would miss.
 */
export function FallbackImage({
  src,
  alt,
  className,
  fallback = null,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  loading?: "lazy" | "eager";
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- optional static asset with a runtime fallback
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(className)}
    />
  );
}
