"use client";

import { useId } from "react";
import Button from "@/app/components/ui/Button";
import SegmentedControl from "@/app/components/ui/SegmentedControl";
import { memorize } from "@/lib/local/client";
import { PROGRESS_STEPS } from "@/lib/local/apply";
import { isStarted } from "@/lib/local/memorize";
import { fmt, t } from "@/lib/i18n";

const NOT_STARTED = { learned: 0, progress: 0 };

function run(duaId, action) {
  memorize(duaId, action).catch((error) => console.error("Could not save the memorize state:", error));
}

// The panel that sets a dua's learned flag and progress (design D7). It reads and writes only the local store.
// `record` is the dua's stored record, or undefined when the reader has never touched it.
export default function MemorizePanel({ duaId, lang, record, onClose, className = "" }) {
  const name = useId();
  const current = record ?? NOT_STARTED;
  return (
    <div
      role="group"
      aria-label={t(lang, "memorizeControl")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onClose) {
          event.stopPropagation();
          onClose();
        }
      }}
      className={`expand rounded-card bg-tint p-card ${className}`}
    >
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-ui">
        <input
          type="checkbox"
          checked={current.learned === 1}
          onChange={(event) => run(duaId, { kind: "learned", value: event.target.checked })}
          className="size-5 cursor-pointer accent-primary"
        />
        <span>{t(lang, "memorizeLearnedCheckbox")}</span>
      </label>
      <SegmentedControl
        className="mt-3"
        legend={t(lang, "memorizeProgressLabel")}
        name={name}
        value={current.progress}
        onChange={(step) => run(duaId, { kind: "progress", value: step })}
        options={PROGRESS_STEPS.map((step) => ({ value: step, label: `${step}%`, name: fmt(lang, "memorizeStep", { n: step }) }))}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" disabled={!isStarted(record)} onClick={() => run(duaId, { kind: "startOver" })}>
          {t(lang, "memorizeStartOver")}
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            {t(lang, "memorizeClose")}
          </Button>
        )}
      </div>
    </div>
  );
}
