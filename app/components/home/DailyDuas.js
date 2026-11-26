"use client";
// Today's few duas from the hand-picked list (design D8). Every listed dua is in the page; today's are the ones shown.
// Before the scripts know the date, the first ones are shown.
import Link from "next/link";
import { useTodayInPlace } from "@/app/components/home/hooks";
import { DUAS_SHOWN, dayIndex, takeFrom } from "@/lib/home/picks";

export default function DailyDuas({ duas }) {
  const today = useTodayInPlace();
  const shown = takeFrom(duas, today ? dayIndex(today, duas.length) : 0, DUAS_SHOWN);
  const rest = duas.filter((dua) => !shown.includes(dua));
  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {[...shown, ...rest].map((dua) => (
        <li key={dua.id} hidden={!shown.includes(dua)} data-home-dua={dua.id} className="min-w-0">
          <Link href={dua.href} className="flex h-full flex-col rounded-lg bg-dua-bg p-4 hover:bg-icon-bg">
            <h3 className="home-accent font-medium">{dua.title}</h3>
            {dua.arabic.map((arabic, i) => (
              <p
                key={i}
                lang="ar"
                dir="rtl"
                className="mt-3 text-right text-[length:var(--arabic-size,28px)] leading-[calc(var(--arabic-size,28px)*48/28)] whitespace-pre-line"
              >
                {arabic}
              </p>
            ))}
          </Link>
        </li>
      ))}
    </ul>
  );
}
