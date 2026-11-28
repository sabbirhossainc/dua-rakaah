"use client";

import { useMemo } from "react";
import MemorizeButton, { memorizeStateLabel } from "@/app/components/MemorizeButton";
import Button from "@/app/components/ui/Button";
import EmptyState from "@/app/components/ui/EmptyState";
import ListCard from "@/app/components/ui/ListCard";
import SectionHeading from "@/app/components/ui/SectionHeading";
import Tag from "@/app/components/ui/Tag";
import { Icon } from "@/app/components/ui/icons";
import { useMemorize } from "@/lib/local/memorize-store";
import { resolveMemorize } from "@/lib/content-index";
import { langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

function Group({ heading, entries, lang, records }) {
  if (entries.length === 0) return null;
  return (
    <section>
      <SectionHeading title={heading} />
      <ul className="flex flex-col gap-cards">
        {entries.map((entry) => {
          const record = records.get(entry.id);
          const learned = record?.learned === 1;
          return (
            <li key={entry.id}>
              <ListCard
                href={entry.href}
                icon={<Icon name="memorize" />}
                title={entry.title}
                meta={`${entry.category} · ${memorizeStateLabel(lang, record)}`}
                // The words are in the line under the title; the tag is the same at a glance.
                trailing={
                  <Tag variant={learned ? "gold" : "tint"} aria-hidden="true">
                    {learned ? <Icon name="check" size={16} /> : `${entry.progress}%`}
                  </Tag>
                }
                action={<MemorizeButton duaId={entry.id} lang={lang} showState={false} className="me-2" />}
              />
            </li>
          );
        })}
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
      <EmptyState
        icon="memorize"
        title={t(lang, "memorizeEmpty")}
        actions={<Button href={`${langPrefix(lang)}/duas`}>{t(lang, "browseDuas")}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-section">
      <Group heading={t(lang, "memorizeInProgress")} entries={inProgress} lang={lang} records={byId} />
      <Group heading={t(lang, "memorizeLearnedHeading")} entries={learned} lang={lang} records={byId} />
    </div>
  );
}
