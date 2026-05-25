"use client";

import { useState } from "react";
import { Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  /** "thumbnail" = small square. "hero" = big card for session view. */
  size?: "thumbnail" | "hero";
};

/**
 * Exercise demo GIF with tap-to-fullscreen.
 * GIFs auto-loop natively; fullscreen view adds an Expand icon for affordance.
 */
export function ExerciseDemo({ src, alt, className, size = "thumbnail" }: Props) {
  const [open, setOpen] = useState(false);

  const containerClass =
    size === "hero"
      ? "relative aspect-square w-full overflow-hidden rounded-2xl bg-canvas"
      : "relative size-12 shrink-0 overflow-hidden rounded-md bg-canvas";

  if (!src) {
    return (
      <div className={cn(containerClass, "bg-gradient-to-br from-surface-raised to-canvas", className)} />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play ${alt} demo fullscreen`}
        className={cn(containerClass, "group", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="size-full object-cover" loading="lazy" />
        {size === "hero" && (
          <div className="pointer-events-none absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md">
            <Expand className="size-4" />
          </div>
        )}
      </button>

      {open && <FullscreenDemo src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function FullscreenDemo({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-[max(16px,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-xl"
      >
        <X className="size-5" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="size-full rounded-2xl object-contain" />
      </div>
      <p className="px-4 text-center text-sm text-white/80">{alt.replace(/_/g, " ")}</p>
      <p className="text-xs text-white/40">Tap anywhere to close</p>
    </div>
  );
}
