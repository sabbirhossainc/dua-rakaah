"use client";
// The first thing Tab reaches: a link past the header and navigation to the content. Shown only when it has focus.
import { usePathname } from "next/navigation";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";

export default function SkipLink() {
  const lang = langFromPathname(usePathname());
  return (
    <a
      href="#main"
      lang={lang}
      className="sr-only rounded-full bg-primary text-ui font-semibold text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:px-5 focus:py-3"
    >
      {t(lang, "skipToContent")}
    </a>
  );
}
