// A horizontal list row, the reference page's "special card": an icon circle, a title and detail lines, with an optional
// trailing tag or chevron (design D4). A control of its own goes in `action`, beside the link and never inside it.
import Link from "next/link";
import IconCircle from "@/app/components/ui/IconCircle";
import { Icon } from "@/app/components/ui/icons";

/**
 * `current` marks the row of the page being shown: `aria-current`, a bar at the start and a heavier title, so it is
 * seen without color. The styles follow the attribute (`.list-card` in globals.css), so a script can set it too.
 */
export default function ListCard({ href, icon, title, meta, trailing, chevron = false, current = false, action, className = "", ...props }) {
  return (
    <div className={`list-card relative flex flex-wrap items-center rounded-tile border border-line bg-surface ${className}`}>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-tile p-3 transition-colors hover:bg-tint motion-reduce:transition-none"
        {...props}
      >
        <IconCircle size={48}>{icon}</IconCircle>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="list-card-title text-ui font-semibold wrap-break-word text-ink">{title}</span>
          {meta && <span className="text-label text-muted">{meta}</span>}
        </span>
        {trailing}
        {chevron && <Icon name="chevron" size={20} className="text-muted" />}
      </Link>
      {action}
    </div>
  );
}
