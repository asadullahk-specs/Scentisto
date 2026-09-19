import { useRef, useState, useEffect } from "react";

export default function ProductCarousel({ children }) {
  const trackRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const total = children.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function calcVisible() {
      const trackWidth = track.clientWidth;
      if (trackWidth === 0 || total === 0) return;
      // Each card item is a direct child of the track div
      const firstCard = track.querySelector(":scope > div");
      if (!firstCard) return;
      const cardWidth = firstCard.getBoundingClientRect().width;
      const gapStyle = getComputedStyle(track).gap;
      const gap = parseFloat(gapStyle) || 0;
      // How many full cards fit in the track viewport
      const count = Math.max(1, Math.round((trackWidth + gap) / (cardWidth + gap)));
      setVisibleCount(Math.min(count, total));
    }

    calcVisible();

    const ro = new ResizeObserver(calcVisible);
    ro.observe(track);
    return () => ro.disconnect();
  }, [total]);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-3 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, i) => (
          <div key={i} className="shrink-0 w-[47%] sm:w-[30%] lg:w-[19%] snap-start">
            {child}
          </div>
        ))}
      </div>

      {/* "X of Y shown" counter — only when not all items fit at once */}
      {visibleCount > 0 && visibleCount < total && (
        <p className="mt-3 text-xs text-ink/40 tracking-wide">
          {visibleCount} of {total} shown
        </p>
      )}
    </div>
  );
}
