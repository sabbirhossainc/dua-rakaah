"use client";

import { useId } from "react";
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
      className={`rounded-lg bg-icon-bg p-4 ${className}`}
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={current.learned === 1}
          onChange={(event) => run(duaId, { kind: "learned", value: event.target.checked })}
          className="h-4 w-4 accent-primary"
        />
        <span>{t(lang, "memorizeLearnedCheckbox")}</span>
      </label>
      <fieldset className="mt-3">
        <legend className="mb-1 text-sm text-gray-500 dark:text-gray-300">{t(lang, "memorizeProgressLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {PROGRESS_STEPS.map((step) => (
            <label
              key={step}
              className="cursor-pointer rounded-full bg-surface px-3 py-1 text-sm has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
            >
              <input
                type="radio"
                name={name}
                value={step}
                checked={current.progress === step}
                onChange={() => run(duaId, { kind: "progress", value: step })}
                className="sr-only"
                aria-label={fmt(lang, "memorizeStep", { n: step })}
              />
              <span aria-hidden="true">{step}%</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!isStarted(record)}
          onClick={() => run(duaId, { kind: "startOver" })}
          className="text-sm text-primary underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
        >
          {t(lang, "memorizeStartOver")}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="text-sm text-gray-500 dark:text-gray-300 underline">
            {t(lang, "memorizeClose")}
          </button>
        )}
      </div>
    </div>
  );
}
