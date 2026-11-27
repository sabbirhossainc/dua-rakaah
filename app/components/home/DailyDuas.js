"use client";
// Today's few duas from the hand-picked list (design D8). Every listed dua is in the page; today's are the ones shown.
// Before the scripts know the date, the first ones are shown.
import { useTodayInPlace } from "@/app/components/home/hooks";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import Ornament from "@/app/components/ui/Ornament";
import Tag from "@/app/components/ui/Tag";
import { DUAS_SHOWN, dayIndex, takeFrom } from "@/lib/home/picks";
import { t } from "@/lib/i18n";

// The feature cards take these in turn, with a tag that stands out on each.
const CARDS = [
  { variant: "tint", tag: "sand" },
  { variant: "gold-tint", tag: "tint" },
  { variant: "sand", tag: "tint" },
];

export default function DailyDuas({ lang, duas }) {
  const today = useTodayInPlace();
  const shown = takeFrom(duas, today ? dayIndex(today, duas.length) : 0, DUAS_SHOWN);
  const rest = duas.filter((dua) => !shown.includes(dua));
  return (
    <ul className="grid gap-cards md:grid-cols-3">
      {[...shown, ...rest].map((dua, i) => {
        const look = CARDS[i % CARDS.length];
        const titleId = `home-dua-${dua.id}`;
        return (
          <li key={dua.id} hidden={!shown.includes(dua)} data-home-dua={dua.id} className="min-w-0 not-[[hidden]]:flex">
            <Card
              variant={look.variant}
              className="w-full"
              tag={<Tag variant={look.tag}>{dua.category}</Tag>}
              art={<Ornament kind="star" size={64} />}
              action={
                <Button variant="outline" href={dua.href} aria-describedby={titleId}>
                  {t(lang, "readDua")}
                </Button>
              }
            >
              <h3 id={titleId} className="font-heading text-card-title text-ink">
                {dua.title}
              </h3>
              {dua.arabic.map((arabic, part) => (
                <p key={part} lang="ar" dir="rtl" className="mt-3 text-right text-arabic whitespace-pre-line text-ink">
                  {arabic}
                </p>
              ))}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
