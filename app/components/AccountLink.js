"use client";
// The link to the page that holds "Delete my data", in the language of the current page.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { langFromPathname, langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

export default function AccountLink() {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);
  const href = `${langPrefix(lang)}/account`;
  return (
    <Link
      href={href}
      lang={lang}
      aria-current={pathname === href ? "page" : undefined}
      className="mr-3 whitespace-nowrap rounded-md px-2 py-1 text-sm underline-offset-4 hover:underline"
    >
      {t(lang, "accountLink")}
    </Link>
  );
}
