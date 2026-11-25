import Link from "next/link";
import { t } from "@/lib/i18n";

// Shown by the service worker (design D6) when a page isn't saved and the device is offline.
// It can't know which language the reader wanted, so it is written in both.
export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

const LANGUAGES = [
  { lang: "en", href: "/duas" },
  { lang: "bn", href: "/bn/duas" },
];

export default function OfflinePage() {
  return (
    <div className="bg-surface rounded-lg p-8 flex flex-col gap-8 items-center text-center">
      {LANGUAGES.map(({ lang, href }) => (
        <section key={lang} lang={lang} className="flex flex-col gap-2 items-center">
          <h1 className="text-xl font-semibold">{t(lang, "offlineTitle")}</h1>
          <p>{t(lang, "offlineBody")}</p>
          <Link href={href} className="text-green-600 underline">
            {t(lang, "offlineLink")}
          </Link>
        </section>
      ))}
    </div>
  );
}
