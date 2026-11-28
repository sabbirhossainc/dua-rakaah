// An information page (About, Privacy Policy, Terms of Use): its sections from lib/pages/info.js, in one language
// (design D9).
import Link from "next/link";
import Card from "@/app/components/ui/Card";
import PageIntro from "@/app/components/ui/PageIntro";
import Section from "@/app/components/ui/Section";
import { langPrefix } from "@/lib/content";
import { fmt, t } from "@/lib/i18n";
import { ABOUT, PRIVACY, PRIVACY_UPDATED, TERMS, TERMS_UPDATED } from "@/lib/pages/info";
import { formatGregorian } from "@/lib/prayer/dates";

const PAGES = {
  about: { title: "aboutTitle", lead: "aboutDescription", sections: ABOUT },
  privacy: { title: "privacyTitle", lead: "privacyDescription", sections: PRIVACY, updated: PRIVACY_UPDATED },
  terms: { title: "termsTitle", lead: "termsDescription", sections: TERMS, updated: TERMS_UPDATED },
};

// The pages a section links to after its text: the path under the language prefix, and its label.
const TARGETS = {
  account: { path: "/account", label: "accountLink" },
  feedback: { path: "/general-feedbacks", label: "feedbackTitle" },
  privacy: { path: "/privacy-policy", label: "privacyTitle" },
  terms: { path: "/terms-of-use", label: "termsTitle" },
};

const LINKS = {
  about: { sources: ["feedback"] },
  privacy: { account: ["account"], contact: ["feedback", "terms"] },
  terms: { agreement: ["privacy"], content: ["feedback"], data: ["account"], contact: ["feedback"] },
};

export default function InfoPage({ page, lang }) {
  const { title, lead, sections, updated } = PAGES[page];
  return (
    <div lang={lang} data-info-page={page}>
      <PageIntro title={t(lang, title)} lead={t(lang, lead)} />
      <Section containerClassName="flex flex-col gap-cards">
        {updated && (
          <p className="text-label text-muted" data-updated>
            {fmt(lang, "pageUpdated", { date: formatGregorian(updated, lang) })}
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
            {(LINKS[page][section.id] ?? []).map((key) => (
              <p key={key} className="mt-3 text-reading">
                <Link href={`${langPrefix(lang)}${TARGETS[key].path}`} className="text-primary underline underline-offset-4">
                  {t(lang, TARGETS[key].label)}
                </Link>
              </p>
            ))}
          </Card>
        ))}
      </Section>
    </div>
  );
}
