"use client";
// Today's hadith quote from the hand-picked list (design D8). Every listed quote is in the page; one is shown.
import { useTodayInPlace } from "@/app/components/home/hooks";
import { dayIndex } from "@/lib/home/picks";
import { t } from "@/lib/i18n";

export default function DailyHadith({ lang, quotes }) {
  const today = useTodayInPlace();
  const index = today && quotes.length ? dayIndex(today, quotes.length) : 0;
  return quotes.map((quote, i) => (
    <figure key={quote.key} hidden={i !== index} data-home-quote={quote.key}>
      <blockquote className="leading-8 whitespace-pre-line">{quote.text}</blockquote>
      <figcaption className="home-subtle mt-3 text-sm whitespace-pre-line">
        {t(lang, "reference")}: {quote.reference}
      </figcaption>
    </figure>
  ));
}
