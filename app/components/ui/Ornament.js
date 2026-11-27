// The style guide's three ornaments, all in gold and all decorative (design D4).

/** An eight-pointed star: two squares, one turned 45 degrees. */
function Star({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
      focusable="false"
      className={`text-gold shrink-0 ${className}`}
    >
      <path d="M5.5 5.5h13v13h-13zM12 2.8 21.2 12 12 21.2 2.8 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

/** A short rule, a dot and a rule, under headings. */
function Rule({ className = "" }) {
  return (
    <svg width="72" height="8" viewBox="0 0 72 8" aria-hidden="true" focusable="false" className={`text-gold block ${className}`}>
      <path d="M0 4h28M44 4h28" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="36" cy="4" r="3" fill="currentColor" />
    </svg>
  );
}

/**
 * `kind` is "rule", "star" or "lattice". The lattice fills its nearest positioned ancestor; what should be above it
 * needs to be positioned too.
 */
export default function Ornament({ kind = "rule", size, className = "" }) {
  if (kind === "star") return <Star size={size} className={className} />;
  if (kind === "lattice") return <span aria-hidden="true" className={`lattice ${className}`} />;
  return <Rule className={className} />;
}
