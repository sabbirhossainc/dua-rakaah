// A small pill that names something: a category, a count, "Now" (design D4).
import { Icon } from "@/app/components/ui/icons";

const VARIANTS = {
  tint: "bg-tint text-primary px-3 py-1",
  // A tint with a border that stands out on any card: for badges on dua cards.
  outline: "bg-tint text-primary border border-edge px-3 py-1",
  gold: "bg-gold text-on-gold px-3 py-1",
  // A solid fill that stands out on any tinted card.
  primary: "bg-primary text-on-primary px-3 py-1",
  // Colored by the surrounding .dua-card-* family.
  feature: "bg-(--dc-badge) text-(--dc-on-badge) border border-(--dc-border) px-3 py-1",
  sand: "bg-sand text-ink px-3 py-1",
  // An icon and text, with no fill.
  text: "text-primary",
};

export default function Tag({ variant = "tint", icon, className = "", children, ...props }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full text-label font-semibold ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}
