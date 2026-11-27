// The card and its tinted and emerald variants (design D4). `tag` sits top left, `action` at the bottom, and `art` is a
// faint decoration bottom right.
import Ornament from "@/app/components/ui/Ornament";

const VARIANTS = {
  surface: "bg-surface",
  tint: "bg-tint",
  sand: "bg-sand",
  "gold-tint": "bg-gold-tint",
  // The dark call to action: `on-emerald` switches text, buttons and the focus ring to colors that read on emerald.
  emerald: "on-emerald",
};

export default function Card({ as: Element = "div", variant = "surface", tag, action, art, className = "", children, ...props }) {
  return (
    <Element className={`relative flex min-w-0 flex-col rounded-card border border-line p-card shadow-card ${VARIANTS[variant]} ${className}`} {...props}>
      {variant === "emerald" && <Ornament kind="lattice" className="rounded-card" />}
      {art && (
        <span aria-hidden="true" className="pointer-events-none absolute right-3 bottom-3 opacity-30">
          {art}
        </span>
      )}
      <div className="relative flex grow flex-col">
        {tag && <div className="mb-3 flex">{tag}</div>}
        {children}
        {action && <div className="mt-auto flex flex-wrap gap-3 pt-4">{action}</div>}
      </div>
    </Element>
  );
}
