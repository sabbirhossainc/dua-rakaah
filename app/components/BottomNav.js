"use client";
// The navigation below 1024px: a bar fixed to the bottom of the screen, with an icon and a label for each entry
// (design D6). `display: none` at the other width takes it out of the accessibility tree and the tab order.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/app/components/SettingsProvider";
import { Icon } from "@/app/components/ui/icons";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";
import { navEntries } from "@/lib/nav";

// The current page has a filled shape behind its icon and a heavier label: more than color.
const ENTRY =
  "group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-tile text-label font-medium text-ink focus-visible:-outline-offset-4 aria-[current=page]:font-bold";

function Face({ name, label }) {
  return (
    <>
      <span className="flex rounded-full px-4 py-0.5 group-hover:bg-tint group-aria-[current=page]:bg-tint group-aria-[current=page]:text-primary">
        <Icon name={name} />
      </span>
      {/* "Memorize" needs the smaller step on the narrowest screens; the Bangla labels fit as they are. */}
      <span className="max-w-full truncate max-[359px]:[&:lang(en)]:text-[12px]">{label}</span>
    </>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);
  const settings = useSettings();
  return (
    <nav
      aria-label={t(lang, "navLabel")}
      lang={lang}
      className="fixed inset-x-0 bottom-0 z-40 h-(--bottom-bar) border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-full grid-cols-5">
        {navEntries(pathname).map((entry) => (
          <li key={entry.key} className="min-w-0">
            {entry.href === null ? (
              <button type="button" aria-haspopup="dialog" aria-expanded={settings.open} onClick={settings.show} className={ENTRY}>
                <Face name={entry.key} label={t(lang, entry.label)} />
              </button>
            ) : (
              <Link href={entry.href} aria-current={entry.current ? "page" : undefined} className={ENTRY}>
                <Face name={entry.key} label={t(lang, entry.label)} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
