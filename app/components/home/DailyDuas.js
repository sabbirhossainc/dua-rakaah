"use client";
// A few duas for the time of day, from the hand-picked lists (design 4 of apply-ux-audit). Every listed dua is in the
// page; those of today and this period are the ones shown. Before the scripts run, the first daytime ones are.
import { useDayPeriod } from "@/app/components/home/hooks";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import Ornament from "@/app/components/ui/Ornament";
import Tag from "@/app/components/ui/Tag";
import { DUAS_SHOWN, dayIndex, takeFrom } from "@/lib/home/picks";
import { t } from "@/lib/i18n";

// The feature cards take these color families in turn (see globals.css).
const CARDS = [
  "dua-card-green",
  "dua-card-gold",
  "dua-card-clay",
];

export default function DailyDuas({ lang, duas, lists }) {
  const { date, list } = useDayPeriod();
  const ids = lists[list];
  const shown = takeFrom(ids, date ? dayIndex(date, ids.length) : 0, DUAS_SHOWN).map((id) =>
    duas.find((dua) => dua.id === id),
  );
  const rest = duas.filter((dua) => !shown.includes(dua));
  return (
    <ul className="grid gap-cards md:grid-cols-3">
      {[...shown, ...rest].map((dua, i) => {
        const look = CARDS[i % CARDS.length];
        const titleId = `home-dua-${dua.id}`;
        return (
          <li key={dua.id} hidden={!shown.includes(dua)} data-home-dua={dua.id} className="min-w-0 not-[[hidden]]:flex">
            <Card
              variant="feature"
              className={`w-full ${look}`}
              tag={<Tag variant="feature">{dua.category}</Tag>}
              art={<Ornament kind="star" size={64} />}
              action={
                <Button variant="feature" href={dua.href} aria-describedby={titleId}>
                  {t(lang, "readDua")}
                </Button>
              }
            >
              <h3 id={titleId} className="line-clamp-2 min-h-[2lh] font-heading text-card-title text-ink">
                {dua.title}
              </h3>
              {/* A fixed height for the Arabic, so every card is the same height; longer duas fade out. */}
              <div className="mt-3 h-40 overflow-hidden mask-b-from-60%">
                {dua.arabic.map((arabic, part) => (
                  <p key={part} lang="ar" dir="rtl" className="mt-3 first:mt-0 text-start text-arabic whitespace-pre-line text-ink">
                    {arabic}
                  </p>
                ))}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
