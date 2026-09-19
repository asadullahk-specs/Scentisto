import { useRef } from "react";

export default function ProductCarousel({ children }) {
  const trackRef = useRef(null);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, i) => (
          <div key={i} className="shrink-0 w-[46%] sm:w-[30%] lg:w-[19%] snap-start">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
