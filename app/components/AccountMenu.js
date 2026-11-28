"use client";
// The account control in the header: a round button with the user icon that opens a small menu of the reader's own
// pages (Profile when signed in, Saved, Memorize) and the sign-in or sign-out action. The menu stays mounted while it
// is closed, so the sign-out warning that AccountControl may open survives the menu closing.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import AccountControl from "@/app/components/AccountControl";
import { Icon } from "@/app/components/ui/icons";
import { useAccount } from "@/lib/local/account-store";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";
import { accountEntries } from "@/lib/nav";

const ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-tile px-3 text-ui font-medium text-ink hover:bg-tint aria-[current=page]:bg-tint aria-[current=page]:font-bold aria-[current=page]:text-primary";

export default function AccountMenu() {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);
  const { ready, account } = useAccount();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const menuId = useId();

  // Closes on a click outside, on Escape (back to the button); a link closes it too.
  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key !== "Escape") return;
      setOpen(false);
      root.current?.querySelector("button")?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready) return null;
  const entries = accountEntries(pathname).filter((entry) => account || entry.key !== "data");
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={t(lang, "accountMenu")}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`relative flex size-9 cursor-pointer items-center justify-center rounded-full border text-ink transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-tint motion-reduce:transition-none ${account ? "border-primary bg-tint text-primary" : "border-ink"}`}
      >
        <Icon name="data" size={20} />
      </button>
      <div
        id={menuId}
        hidden={!open}
        className="absolute inset-e-0 top-full z-50 mt-2 w-56 rounded-tile border border-line bg-surface p-2 shadow-lg"
      >
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => (
            <li key={entry.key}>
              <Link href={entry.href} aria-current={entry.current ? "page" : undefined} className={ITEM} onClick={() => setOpen(false)}>
                <Icon name={entry.key} size={20} />
                {t(lang, entry.label)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-line pt-2">
          <AccountControl variant={account ? "ghost" : "primary"} className="w-full" />
        </div>
      </div>
    </div>
  );
}
