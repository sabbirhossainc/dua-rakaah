"use client";

import Link from "next/link";
import { useMemo } from "react";
import MemorizeButton, { memorizeStateLabel } from "@/app/components/MemorizeButton";
import { useMemorize } from "@/lib/local/memorize-store";
import { resolveMemorize } from "@/lib/content-index";
import { langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

function Group({ heading, entries, lang, records }) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg text-gray-600 dark:text-gray-300">{heading}</h2>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-lg bg-surface p-5">
            <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-3">
              <Link href={entry.href} className="block min-w-0 flex-1 hover:opacity-80">
                <span className="block font-medium text-primary">{entry.title}</span>
                <span className="mt-1 block text-sm text-gray-400">
                  {entry.category} · {memorizeStateLabel(lang, records.get(entry.id))}
                </span>
                <span className="mt-2 block h-1.5 rounded bg-icon-bg" aria-hidden="true">
                  <span className="block h-1.5 rounded bg-primary" style={{ width: `${entry.progress}%` }} />
                </span>
              </Link>
              <MemorizeButton duaId={entry.id} lang={lang} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The duas the reader has started, from the local store, joined with the title index the page carries (design D7).
// Nothing here needs the network, so it works offline.
export default function MemorizeList({ lang, index }) {
  const { ready, list, byId } = useMemorize();
  const { inProgress, learned } = useMemo(() => resolveMemorize(list, index), [list, index]);

  // Until the local store has been read, show nothing rather than a wrong "nothing started" message.
  if (!ready) return <div className="min-h-40" aria-busy="true" />;

  if (inProgress.length === 0 && learned.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg bg-surface p-6">
        <p>{t(lang, "memorizeEmpty")}</p>
        <Link href={`${langPrefix(lang)}/duas`} className="text-primary underline">
          {t(lang, "memorizeEmptyLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <Group heading={t(lang, "memorizeInProgress")} entries={inProgress} lang={lang} records={byId} />
      <Group heading={t(lang, "memorizeLearnedHeading")} entries={learned} lang={lang} records={byId} />
    </div>
  );
}
