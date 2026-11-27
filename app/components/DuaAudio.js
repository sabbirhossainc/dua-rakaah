"use client";

import { useEffect } from "react";
import Button from "@/app/components/ui/Button";
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

const ICON = { idle: "play", loading: "spinner", playing: "pause", paused: "play" };

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
      <Button
        variant="outline"
        icon={ICON[view.state]}
        iconFilled={view.state !== "loading"}
        iconClassName={view.state === "loading" ? "animate-spin motion-reduce:animate-none" : ""}
        aria-disabled={unavailable || undefined}
        onClick={() => toggleAudio(audio.key, sources)}
      >
        <span>{t(lang, LABEL_KEY[view.state])}</span>
      </Button>
      <p className="text-label text-muted">{fmt(lang, credit.label, credit.vars)}</p>
      {credit.fullVerse && <p className="text-label text-muted">{t(lang, "audioFullVerse")}</p>}
    </div>
  );
}
