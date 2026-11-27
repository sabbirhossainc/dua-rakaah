// A round tinted frame around an icon or a category image (design D4).
const SIZES = { 40: "size-10", 48: "size-12", 56: "size-14" };
const VARIANTS = { tint: "bg-tint text-primary", "gold-tint": "bg-gold-tint text-gold-text" };

export default function IconCircle({ size = 48, variant = "tint", className = "", children }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
