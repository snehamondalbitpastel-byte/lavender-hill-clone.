"use client";

import { useState } from "react";
import Image from "next/image";

// Customer return proof photos: thumbnails that open in an in-page modal
// (lightbox) instead of navigating away. Supports prev/next when there are
// several, Esc/scrim/✕ to close.
export default function ReturnPhotos({ images }: { images: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((u, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(i)}
            title="View photo"
            className="relative block h-16 w-16 overflow-hidden rounded border border-line bg-white transition-colors hover:border-espresso"
          >
            <Image src={u} alt="return proof" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Return photo"
          onClick={() => setOpen(null)}
        >
          <div className="absolute inset-0 bg-espresso/70" />
          <div className="relative z-[1]" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-[85vh] w-[85vw]">
              <Image src={images[open]} alt="return proof" fill sizes="85vw" className="object-contain" />
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-espresso shadow-soft-lg transition-colors hover:bg-white"
            >
              <svg width="15" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="1.7" /></svg>
            </button>

            {/* Prev / next when there are multiple photos */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setOpen((open - 1 + images.length) % images.length)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 text-lg text-espresso transition-colors hover:bg-white"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setOpen((open + 1) % images.length)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 text-lg text-espresso transition-colors hover:bg-white"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
