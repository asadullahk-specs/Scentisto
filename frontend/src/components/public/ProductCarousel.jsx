import { Children, useCallback, useEffect, useRef, useState } from "react";

/**
 * Horizontal product rail.
 *
 * Fixes over the previous version:
 *  - `children.length` assumed children was always an array. React
 *    passes a single child through as a bare element, which has no
 *    .length, so a one-product section threw at render. Children.toArray
 *    normalises that (and gives stable keys).
 *  - There were no controls at all on desktop, where there is no
 *    touch-drag affordance - the rail looked like a clipped grid.
 *    Arrows now appear only when the content actually overflows, and
 *    each is disabled at its end of the track.
 *  - The track is a contained scroller (overscroll-behavior-x:
 *    contain via .scroll-x) so flicking it never turns into a
 *    page-level horizontal scroll or a browser back-swipe.
 */
export default function ProductCarousel({ children, itemClassName }) {
  const items = Children.toArray(children);
  const total = items.length;

  const trackRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || total === 0) return;

    const trackWidth = track.clientWidth;
    const firstCard = track.querySelector(":scope > div");
    if (trackWidth > 0 && firstCard) {
      const cardWidth = firstCard.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
      if (cardWidth > 0) {
        const count = Math.max(
          1,
          Math.round((trackWidth + gap) / (cardWidth + gap)),
        );
        setVisibleCount(Math.min(count, total));
      }
    }

    // 1px tolerance: sub-pixel layout means scrollLeft rarely lands
    // exactly on the maximum, which would leave the arrow enabled
    // forever at the end of the track.
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScrollLeft(track.scrollLeft > 1);
    setCanScrollRight(track.scrollLeft < maxScroll - 1);
  }, [total]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    track.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      track.removeEventListener("scroll", measure);
    };
  }, [measure]);

  function scrollByPage(direction) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.round(track.clientWidth * 0.9),
      behavior: "smooth",
    });
  }

  const hasOverflow = visibleCount > 0 && visibleCount < total;

  if (total === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="scroll-x flex gap-3 sm:gap-6 scroll-smooth snap-x snap-mandatory pb-2"
      >
        {items.map((child, i) => (
          <div
            key={i}
            className={
              itemClassName ||
              "shrink-0 snap-start w-[47%] xs:w-[42%] sm:w-[31%] lg:w-[23%] xl:w-[19%]"
            }
          >
            {child}
          </div>
        ))}
      </div>

      {hasOverflow && (
        <>
          {/* Arrows are hidden below sm: on a phone the rail is
              scrolled by touch, and floating controls would just
              cover product imagery on a narrow screen. */}
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous products"
            className="hidden sm:flex absolute left-0 top-[35%] -translate-x-1/2 z-10 w-10 h-10 items-center justify-center bg-bg border border-border shadow-soft hover:border-ink transition disabled:opacity-0 disabled:pointer-events-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            disabled={!canScrollRight}
            aria-label="Next products"
            className="hidden sm:flex absolute right-0 top-[35%] translate-x-1/2 z-10 w-10 h-10 items-center justify-center bg-bg border border-border shadow-soft hover:border-ink transition disabled:opacity-0 disabled:pointer-events-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <p className="mt-3 text-xs text-ink/40 tracking-wide">
            {visibleCount} of {total} shown
          </p>
        </>
      )}
    </div>
  );
}
