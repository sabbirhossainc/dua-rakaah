import Button from "@/app/components/ui/Button";
import EmptyState from "@/app/components/ui/EmptyState";
import Section from "@/app/components/ui/Section";
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
    <Section containerClassName="flex max-w-[760px]! flex-col gap-cards">
      {LANGUAGES.map(({ lang, href }, i) => (
        <EmptyState
          key={lang}
          lang={lang}
          // The page has one level-one heading.
          level={i === 0 ? 1 : 2}
          icon="offline"
          title={t(lang, "offlineTitle")}
          text={t(lang, "offlineBody")}
          actions={<Button href={href}>{t(lang, "offlineLink")}</Button>}
        />
      ))}
    </Section>
  );
}
