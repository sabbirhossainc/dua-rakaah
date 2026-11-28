"use client";
// The header at every width: the mark and name, from 1024px the services as text links, then the Settings icon and
// the account menu (design D6).
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/app/components/AccountMenu";
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
                <Link href={entry.href} aria-current={entry.current ? "page" : undefined} className={ENTRY}>
                  {t(lang, entry.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Settings as an icon beside the account menu. Keeps its width before the account is known. */}
        <div className="flex min-w-20 shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            aria-label={t(lang, "navSettings")}
            aria-haspopup="dialog"
            aria-expanded={settings.open}
            onClick={settings.show}
            className="relative flex size-9 cursor-pointer items-center justify-center rounded-full border border-transparent text-ink transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-tint motion-reduce:transition-none"
          >
            <Icon name="settings" size={20} />
          </button>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
