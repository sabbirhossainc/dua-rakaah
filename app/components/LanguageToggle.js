"use client";
// The language choice. It is not a setting: it takes the reader to the same page in the other language (design D7).
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SegmentedControl from "@/app/components/ui/SegmentedControl";
import { langFromPathname, switchLanguageHref } from "@/lib/content";
import { t } from "@/lib/i18n";

// Each language is named in itself.
const OPTIONS = [
  { value: "en", label: "English", lang: "en" },
  { value: "bn", label: "বাংলা", lang: "bn" },
];

// useSearchParams needs a Suspense boundary on prerendered pages: SettingsPanel has it. The fragment is only known in
// the browser, so it is read when a language is chosen.
export default function LanguageToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = langFromPathname(pathname);

  function select(target) {
    if (target === active) return;
    router.push(switchLanguageHref(pathname, searchParams.toString(), window.location.hash, target));
  }

  return (
    <SegmentedControl icon="language" legend={t(active, "languageLegend")} name="language" value={active} onChange={select} options={OPTIONS} />
  );
}
