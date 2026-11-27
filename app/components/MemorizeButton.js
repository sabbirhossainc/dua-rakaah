"use client";

import { useId, useState } from "react";
import { useMemorize } from "@/lib/local/memorize-store";
import { isStarted } from "@/lib/local/memorize";
import MemorizePanel from "@/app/components/MemorizePanel";
import Button from "@/app/components/ui/Button";
import Tag from "@/app/components/ui/Tag";
import { Icon } from "@/app/components/ui/icons";
import { fmt, t } from "@/lib/i18n";

/** The name a screen reader hears: what the control is, and the state the dua is in. */
export function memorizeStateLabel(lang, record) {
  if (record?.learned === 1) return t(lang, "memorizeStateLearned");
  if (isStarted(record)) return fmt(lang, "memorizeStateProgress", { n: record.progress });
  return t(lang, "memorizeStateNone");
}

// The memorize control on a dua card (design D7). The panel opens inline, as a full-width item of the icon row, so
// the card's overflow cannot clip it. Cards render "not started" until the first local read finishes.
export default function MemorizeButton({ duaId, lang, showState = true, className = "" }) {
  const { byId } = useMemorize();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const record = byId.get(duaId);
  const learned = record?.learned === 1;
  const started = isStarted(record);
  // Where the row already shows the state (the memorize page), the button is the icon alone.
  const tagged = showState && started;
  const label = `${t(lang, "memorizeControl")}: ${memorizeStateLabel(lang, record)}`;
  return (
    <>
      <Button
        variant="ghost"
        icon="memorize"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) setOpen(false);
        }}
        className={`${tagged ? "px-3!" : ""} ${className}`}
      >
        {tagged ? (
          <Tag variant={learned ? "gold" : "tint"} aria-hidden="true">
            {learned ? <Icon name="check" size={16} /> : `${record.progress}%`}
          </Tag>
        ) : null}
      </Button>
      {open && (
        <div id={panelId} className="order-last w-full basis-full">
          <MemorizePanel duaId={duaId} lang={lang} record={record} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
