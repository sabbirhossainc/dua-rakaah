// The app's mark and wordmark (design D12). The mark is the gold eight-pointed star on emerald, the same file as the
// favicon. The Arabic word دعاء is drawn here as strokes in a geometric Kufi style, so no font is loaded for it.
import Image from "next/image";

export function Mark({ size = 40 }) {
  return <Image src="/icons/dua-logo.svg" alt="" width={size} height={size} className="shrink-0" />;
}

/** دعاء, from the right: dal, initial ain joined to alef, and hamza. */
function ArabicWord({ className = "" }) {
  return (
    <svg
      viewBox="0 0 56 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M45 8c5 4 8 8 8 12 0 3-2 4-5 4h-5" />
      <path d="M39 11c-5-3-11 0-11 5 0 3 3 5 10 3M29.5 18.5c0 3.5-2.5 5.5-5.5 5.5h-4V4" />
      <path d="M13 14c-4-2-8 1-6 4 1 2 4 2 6 1M13 19 3 24" />
    </svg>
  );
}

/** "Dua & Raka'ah" with its Arabic word. */
export default function Wordmark({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}>
      <span lang="en" className="font-heading text-ink text-[18px] leading-none font-semibold sm:text-[21px]">
        {"Dua & Raka'ah"}
      </span>
      <ArabicWord className="text-gold hidden h-5 w-auto sm:block" />
    </span>
  );
}
