"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useMemorize } from "@/lib/local/memorize-store";
import { isStarted } from "@/lib/local/memorize";
import MemorizePanel from "@/app/components/MemorizePanel";
import { fmt, t } from "@/lib/i18n";

/** The name a screen reader hears: what the control is, and the state the dua is in. */
export function memorizeStateLabel(lang, record) {
  if (record?.learned === 1) return t(lang, "memorizeStateLearned");
  if (isStarted(record)) return fmt(lang, "memorizeStateProgress", { n: record.progress });
  return t(lang, "memorizeStateNone");
}

// The memorize control on a dua card (design D7). The panel opens inline, as a full-width item of the icon row, so
// the card's overflow cannot clip it. Cards render "not started" until the first local read finishes.
export default function MemorizeButton({ duaId, lang }) {
  const { byId } = useMemorize();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const record = byId.get(duaId);
  const learned = record?.learned === 1;
  const started = isStarted(record);
  const label = `${t(lang, "memorizeControl")}: ${memorizeStateLabel(lang, record)}`;
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) setOpen(false);
        }}
        className={`relative w-6 cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
          learned ? "rounded-full ring-2 ring-primary" : ""
        }`}
      >
        <Image src="/icons/plan.svg" width={24} height={24} alt="" aria-hidden="true" />
        {started && (
          <span
            aria-hidden="true"
            className="absolute -right-3 -top-3 rounded-full bg-primary px-1 text-[10px] leading-4 text-white"
          >
            {learned ? "✓" : `${record.progress}%`}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className="order-last w-full basis-full">
          <MemorizePanel duaId={duaId} lang={lang} record={record} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
