import { useCallback, useEffect, useRef, useState } from 'react'
import { primaryIndex, type GalleryImage } from './galleryImages'

/** US-012 -- fills the card's cover image area (a `relative` container the
 * caller sizes, e.g. `aspect-[3/4]`). A single image with no interaction at
 * all when the item only has one (or zero) images -- once there's more than
 * one, moving the mouse (desktop) or a finger (touch) across the image
 * previews the others by cursor position (dots along the bottom show how
 * many exist and which is active), and clicking opens the Lightbox at
 * whichever image is currently previewed.
 *
 * Deliberately built from scratch rather than an npm slider/lightbox
 * library (ARCHITECTURE.md flagged this as worth evaluating) -- same call
 * as `ItemPhotoManager.tsx`'s native drag-and-drop reorder: no new
 * dependency to keep in sync, and this sandbox's npm registry access is
 * blocked for new installs, which already caused one CI failure (lock file
 * out of sync) for the Vitest dependencies -- not worth risking twice. */
export function PhotoSlider({ images, alt }: { images: GalleryImage[]; alt: string }) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
        No cover
      </div>
    )
  }

  const activeIndex = previewIndex ?? primaryIndex(images)
  const hasMultiple = images.length > 1

  function indexFromClientX(clientX: number): number {
    const el = containerRef.current
    if (!el) return activeIndex

    const rect = el.getBoundingClientRect()
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 0.999)

    return Math.floor(ratio * images.length)
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative h-full w-full cursor-pointer touch-pan-y select-none"
        onMouseMove={(e) => hasMultiple && setPreviewIndex(indexFromClientX(e.clientX))}
        onMouseLeave={() => setPreviewIndex(null)}
        onTouchMove={(e) => {
          if (!hasMultiple) return
          const touch = e.touches[0]
          if (touch) setPreviewIndex(indexFromClientX(touch.clientX))
        }}
        onTouchEnd={() => setPreviewIndex(null)}
        onClick={() => setLightboxIndex(activeIndex)}
      >
        <img src={images[activeIndex].url} alt={alt} className="h-full w-full object-cover" />

        {hasMultiple && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  i === activeIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          alt={alt}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}

/** US-012 -- fullscreen popup, item-card-width (not full browser width) on
 * desktop. Left/right arrow buttons overlaid on the image and the physical
 * keyboard arrow keys both navigate, looping infinitely in both directions
 * (no autoplay). A thumbnail strip below (~50px desktop, ~30px mobile) shows
 * every image, keeping the active one scrolled to the middle. Escape or a
 * click outside the image closes it. */
function Lightbox({
  images,
  initialIndex,
  alt,
  onClose,
}: {
  images: GalleryImage[]
  initialIndex: number
  alt: string
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])

  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  )
  const goNext = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext, onClose])

  // Keeps the active thumbnail scrolled to the middle of the strip as the
  // viewer navigates, per spec.
  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [index])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md hover:bg-white"
      >
        ✕
      </button>

      <div
        className="relative flex w-full max-w-3xl items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 && <LightboxArrowButton direction="prev" onClick={goPrev} />}

        <img
          src={images[index].url}
          alt={alt}
          className="max-h-[75vh] w-full rounded-lg object-contain"
        />

        {images.length > 1 && <LightboxArrowButton direction="next" onClick={goNext} />}
      </div>

      {images.length > 1 && (
        <div
          className="flex max-w-full gap-2 overflow-x-auto px-2"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              ref={(el) => {
                thumbRefs.current[i] = el
              }}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Image ${i + 1}`}
              className={`h-[30px] w-[30px] shrink-0 overflow-hidden rounded border-2 transition sm:h-[50px] sm:w-[50px] ${
                i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LightboxArrowButton({
  direction,
  onClick,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'prev' ? 'Previous image' : 'Next image'}
      className={`absolute z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-700 shadow-md backdrop-blur-sm hover:bg-white ${
        direction === 'prev' ? 'left-2' : 'right-2'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        {direction === 'prev' ? (
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  )
}
