import { useState, useRef } from "react";

export default function ImageCarousel({
  images = [],
  alt = "Room photo",
  height = "h-[260px] sm:h-[420px]",
  rounded = "rounded-2xl",
  showThumbnails = false,
  preventLinkNavigation = false,
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  if (!images || images.length === 0) return null;

  const safeIndex = index >= images.length ? 0 : index;
  const hasMultiple = images.length > 1;

  const goTo = (nextIdx, e) => {
    if (preventLinkNavigation && e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIndex((nextIdx + images.length) % images.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || !hasMultiple) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      goTo(diff > 0 ? safeIndex + 1 : safeIndex - 1);
    }
    touchStartX.current = null;
  };

  return (
    <div className="w-full">
      <div
        className={`relative w-full overflow-hidden ${rounded} ${height}`}
        style={{ background: "var(--sur2)" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding track */}
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${alt} ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover shrink-0 select-none"
              draggable={false}
            />
          ))}
        </div>

        {hasMultiple && (
          <>
            {/* Counter pill */}
            <div
              className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(6px)",
              }}
            >
              {safeIndex + 1} / {images.length}
            </div>

            {/* Prev / Next arrows */}
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => goTo(safeIndex - 1, e)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white border-0 cursor-pointer transition-transform hover:scale-110"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(6px)",
                fontSize: "1.1rem",
                lineHeight: 1,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => goTo(safeIndex + 1, e)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white border-0 cursor-pointer transition-transform hover:scale-110"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(6px)",
                fontSize: "1.1rem",
                lineHeight: 1,
              }}
            >
              ›
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={(e) => goTo(i, e)}
                  className="border-0 rounded-full cursor-pointer transition-all p-0"
                  style={{
                    width: i === safeIndex ? 16 : 6,
                    height: 6,
                    background: i === safeIndex ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Optional clickable thumbnails */}
      {showThumbnails && hasMultiple && (
        <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className="p-0 rounded-xl overflow-hidden shrink-0 cursor-pointer transition-all"
              style={{
                width: 68,
                height: 52,
                border: i === safeIndex ? "2px solid var(--p)" : "1px solid var(--bdr)",
                opacity: i === safeIndex ? 1 : 0.65,
              }}
            >
              <img src={src} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
