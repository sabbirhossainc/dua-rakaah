// Every action button and button-like link (design D4). A caller picks a variant, never a color.
import Link from "next/link";
import { Icon } from "@/app/components/ui/icons";

const VARIANTS = {
  primary: "bg-primary text-on-primary border-primary hover:bg-primary/90",
  gold: "bg-gold text-on-gold border-gold hover:bg-gold/90",
  outline: "border-ink text-ink hover:bg-tint",
  ghost: "border-transparent text-primary hover:bg-tint",
  danger: "border-danger text-danger hover:bg-danger/10",
  // Colored by the surrounding .dua-card-* family.
  feature: "bg-(--dc-cta) text-(--dc-on-cta) border-(--dc-cta) hover:opacity-90",
};

// 36px, 44px and 52px high. A button with an icon and no text is as wide as it is high. `sm` is the default (design D1
// of apply-audit-pages-and-feedback): it is drawn 36px high, and a pseudo-element 4px beyond each edge keeps its target
// 44px. Neighbouring `sm` buttons need a gap of at least 8px so those areas do not overlap.
const SIZES = {
  sm: { text: "min-h-9 px-4 py-1 relative after:absolute after:-inset-1 after:content-['']", icon: "size-9 relative after:absolute after:-inset-1 after:content-['']" },
  md: { text: "min-h-11 px-5 py-2", icon: "size-11" },
  lg: { text: "min-h-13 px-7 py-3", icon: "size-13" },
};

/** With `href` it is a link, otherwise a button. `icon` names an icon shown before the text. */
export default function Button({
  variant = "primary",
  size = "sm",
  href,
  icon,
  iconFilled = false,
  iconClassName = "",
  className = "",
  children,
  ...props
}) {
  const shape = SIZES[size][children ? "text" : "icon"];
  const classes = `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border text-center text-ui font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-60 ${VARIANTS[variant]} ${shape} ${className}`;
  const content = (
    <>
      {icon && <Icon name={icon} size={20} filled={iconFilled} className={iconClassName} />}
      {children}
    </>
  );
  if (href !== undefined) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...props}>
      {content}
    </button>
  );
}
