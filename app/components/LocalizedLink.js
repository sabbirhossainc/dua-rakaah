"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { langFromPathname } from "@/lib/content";

// A link whose target depends on the language of the current page.
export default function LocalizedLink({ hrefs, children, ...props }) {
  const lang = langFromPathname(usePathname());
  return (
    <Link href={hrefs[lang]} {...props}>
      {children}
    </Link>
  );
}
