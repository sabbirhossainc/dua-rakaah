// A bordered, centered link: an icon circle with a name and a line under it (design D4).
import Link from "next/link";
import IconCircle from "@/app/components/ui/IconCircle";

export default function Tile({ href, icon, label, meta, className = "", ...props }) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 min-w-0 flex-col items-center gap-3 rounded-tile border border-line bg-surface p-card text-center transition-colors hover:border-primary hover:bg-tint motion-reduce:transition-none ${className}`}
      {...props}
    >
      <IconCircle size={56}>{icon}</IconCircle>
      <span className="text-ui font-semibold wrap-break-word text-ink">{label}</span>
      {meta && <span className="mt-auto">{meta}</span>}
    </Link>
  );
}
