// An information page (About, Privacy Policy): its sections from lib/pages/info.js, in one language (design D9).
import Link from "next/link";
import Card from "@/app/components/ui/Card";
import PageIntro from "@/app/components/ui/PageIntro";
import Section from "@/app/components/ui/Section";
import { langPrefix } from "@/lib/content";
import { fmt, t } from "@/lib/i18n";
import { ABOUT, PRIVACY, PRIVACY_UPDATED } from "@/lib/pages/info";
import { formatGregorian } from "@/lib/prayer/dates";

const PAGES = {
  about: { title: "aboutTitle", lead: "aboutDescription", sections: ABOUT },
  privacy: { title: "privacyTitle", lead: "privacyDescription", sections: PRIVACY },
};

export default function InfoPage({ page, lang }) {
  const { title, lead, sections } = PAGES[page];
  return (
    <div lang={lang} data-info-page={page}>
      <PageIntro title={t(lang, title)} lead={t(lang, lead)} />
      <Section containerClassName="flex flex-col gap-cards">
        {page === "privacy" && (
          <p className="text-label text-muted" data-updated>
            {fmt(lang, "privacyUpdated", { date: formatGregorian(PRIVACY_UPDATED, lang) })}
          </p>
        )}
        {sections[lang].map((section) => (
          <Card as="section" key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="max-w-[760px]">
            <h2 id={`${section.id}-title`} className="font-heading text-card-title text-ink">
              {section.heading}
            </h2>
            {section.body.map((text) => (
              <p key={text} className="mt-3 text-reading">
                {text}
              </p>
            ))}
            {page === "privacy" && section.id === "account" && (
              <p className="mt-3 text-reading">
                <Link href={`${langPrefix(lang)}/account`} className="text-primary underline underline-offset-4">
                  {t(lang, "accountLink")}
                </Link>
              </p>
            )}
            {page === "about" && section.id === "sources" && (
              <p className="mt-3 text-reading">
                <Link href={`${langPrefix(lang)}/general-feedbacks`} className="text-primary underline underline-offset-4">
                  {t(lang, "feedbackTitle")}
                </Link>
              </p>
            )}
          </Card>
        ))}
      </Section>
    </div>
  );
}
