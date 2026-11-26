"use client";

import { useEffect } from "react";
import { stopAudio, toggleAudio, useOnline, usePartAudio } from "@/lib/audio/player-store";
import { creditOf, partSources } from "@/lib/audio/sources";
import { fmt, t } from "@/lib/i18n";
import { usePreferences } from "@/lib/local/preferences-store";
import { DEFAULT_RECITER_ID } from "@/lib/preferences";

const LABEL_KEY = {
  idle: "audioPlay",
  loading: "audioLoading",
  playing: "audioPause",
  paused: "audioPlay",
  unavailable: "audioUnavailable",
};

function Icon({ state }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true };
  if (state === "loading") {
    return (
      <svg {...common} className="animate-spin motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M12 3a9 9 0 1 1-9 9" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="currentColor">
      <path d={state === "playing" ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z"} />
    </svg>
  );
}

// The recitation control of one dua part (design D5 of 4a, D7 of 4b). Offline it renders nothing at all.
// `audio` is `{ key, duaId, part, urls, quran }` from lib/audio/lookup.js.
export default function DuaAudio({ audio, lang }) {
  const online = useOnline();
  const { values } = usePreferences();
  const sources = partSources(audio, values.reciter_id ?? DEFAULT_RECITER_ID);
  const view = usePartAudio(audio.key, sources);
  // Leaving the page stops the sound.
  useEffect(() => () => stopAudio(audio.key), [audio.key]);
  if (!online) return null;
  const unavailable = view.state === "unavailable";
  const credit = creditOf(view, audio.quran);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* aria-disabled, not disabled: the button keeps the keyboard focus when it becomes unavailable. */}
      <button
        type="button"
        aria-disabled={unavailable || undefined}
        onClick={() => toggleAudio(audio.key, sources)}
        className={`flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
          unavailable ? "!cursor-default text-muted" : "text-primary"
        }`}
      >
        {!unavailable && <Icon state={view.state} />}
        <span>{t(lang, LABEL_KEY[view.state])}</span>
      </button>
      <p className="text-[13px] text-muted">{fmt(lang, credit.label, credit.vars)}</p>
      {credit.fullVerse && <p className="text-[13px] text-muted">{t(lang, "audioFullVerse")}</p>}
    </div>
  );
}
