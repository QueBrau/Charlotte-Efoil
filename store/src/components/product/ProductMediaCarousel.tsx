"use client";

import { useCallback, useEffect, useState } from "react";

import { resolveStoreMediaUrl } from "@/lib/constants";
import { StoreImage } from "@/components/ui/StoreImage";
import type { ProductMedia } from "@/types/commerce";

interface ProductMediaCarouselProps {
  media: ProductMedia[];
  productName: string;
  /** Larger padding on the main image (product detail page). */
  spacious?: boolean;
}

export function ProductMediaCarousel({
  media,
  productName,
  spacious = true,
}: ProductMediaCarouselProps) {
  const images = media.filter((item) => item.mediaType === "image");
  const videos = media.filter((item) => item.mediaType === "video");
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const active = images[activeIndex] ?? images[0];
  const hasMultiple = images.length > 1;

  const goTo = useCallback(
    (index: number) => {
      if (!images.length) return;
      const next = ((index % images.length) + images.length) % images.length;
      setActiveIndex(next);
      setZoomed(false);
    },
    [images.length],
  );

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    if (!hasMultiple) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, hasMultiple]);

  if (!active) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-brand-surface text-brand-muted">
        No media available
      </div>
    );
  }

  const mainPadding = spacious ? "p-8" : "p-6";

  return (
    <div className="space-y-4">
      <div className="relative">
        <button
          type="button"
          className={`gallery-zoom relative aspect-square w-full overflow-hidden rounded-3xl bg-brand-surface ${zoomed ? "is-zoomed" : ""}`}
          onClick={() => setZoomed((value) => !value)}
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
        >
          <StoreImage
            src={active.url}
            alt={active.altText ?? productName}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={`object-contain ${mainPadding} transition-transform duration-300 ${zoomed ? "scale-150" : "scale-100"}`}
            priority={activeIndex === 0}
          />
        </button>

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border bg-white/95 text-xl text-brand shadow-md transition hover:bg-white"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border bg-white/95 text-xl text-brand shadow-md transition hover:bg-white"
              aria-label="Next image"
            >
              ›
            </button>
            <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand/80 px-3 py-1 text-xs font-medium text-white">
              {activeIndex + 1} / {images.length}
            </p>
          </>
        ) : null}
      </div>

      {hasMultiple ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(index)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-brand-surface ${
                index === activeIndex ? "border-brand" : "border-transparent"
              }`}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <StoreImage
                src={item.url}
                alt={item.altText ?? `${productName} thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      ) : null}

      {videos.map((video) => (
        <div key={video.id} className="overflow-hidden rounded-2xl bg-black">
          <video
            src={video.url}
            controls
            playsInline
            className="aspect-video w-full"
            poster={resolveStoreMediaUrl(active.url) ?? undefined}
          >
            <track kind="captions" />
          </video>
        </div>
      ))}
    </div>
  );
}
