"use client";
// The hadith quote of this date and prayer period, from the hand-picked list (design D5). Every listed quote is in the
// page; one is shown. Before the scripts run it is the Dhuhr quote of the day the page was built.
import { useHadithSlot } from "@/app/components/home/hooks";
import { hadithIndex } from "@/lib/home/picks";
import { t } from "@/lib/i18n";

export default function DailyHadith({ lang, quotes, buildDate }) {
  const slot = useHadithSlot() ?? { date: buildDate, period: "dhuhr" };
  const index = quotes.length ? hadithIndex(slot.date, slot.period, quotes.length) : 0;
  return quotes.map((quote, i) => (
    <figure key={quote.key} hidden={i !== index} data-home-quote={quote.key} className="max-w-reading">
      <blockquote className="font-heading text-card-title whitespace-pre-line text-ink italic">{quote.text}</blockquote>
      <figcaption className="mt-3 text-label whitespace-pre-line text-gold-text">
        {t(lang, "reference")}: {quote.reference}
      </figcaption>
    </figure>
  ));
}
