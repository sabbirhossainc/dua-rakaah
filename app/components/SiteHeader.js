"use client";
// The header at every width: the mark and name, from 1024px the navigation as text links, and the account control
// (design D6).
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountControl from "@/app/components/AccountControl";
import { useSettings } from "@/app/components/SettingsProvider";
import Wordmark, { Mark } from "@/app/components/ui/Wordmark";
import { Icon } from "@/app/components/ui/icons";
import { langFromPathname, langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";
import { navEntries } from "@/lib/nav";

// The current page has a gold underline and a heavier label: more than color.
const ENTRY =
  "flex min-h-11 cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-3 text-ui font-medium text-ink transition-colors hover:border-line aria-[current=page]:border-gold aria-[current=page]:font-bold motion-reduce:transition-none";

export default function SiteHeader() {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);
  const settings = useSettings();
  return (
    <header lang={lang} className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="container-page flex h-[calc(var(--header-height)-1px)] items-center justify-between gap-2">
        <Link href={langPrefix(lang) || "/"} className="flex min-h-11 min-w-0 items-center gap-2 rounded-tile">
          <Mark size={36} />
          <Wordmark />
        </Link>
        <nav aria-label={t(lang, "navLabel")} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navEntries(pathname).map((entry) => (
              <li key={entry.key}>
                {entry.href === null ? (
                  <button type="button" aria-haspopup="dialog" aria-expanded={settings.open} onClick={settings.show} className={ENTRY}>
                    <Icon name={entry.key} size={20} />
                    {t(lang, entry.label)}
                  </button>
                ) : (
                  <Link href={entry.href} aria-current={entry.current ? "page" : undefined} className={ENTRY}>
                    {t(lang, entry.label)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* Keeps its width before the account is known, so the navigation doesn't move. */}
        <div className="flex min-w-24 shrink-0 justify-end">
          <AccountControl />
        </div>
      </div>
    </header>
  );
}
