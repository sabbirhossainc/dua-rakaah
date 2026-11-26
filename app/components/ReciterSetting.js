"use client";
// The Quran.com reciter choice in the Settings panel (design D8): a native select, so the keyboard and the selected
// state come from the browser. Hidden offline, on the server, and when the Quran.com source is not set up.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useOnline } from "@/lib/audio/player-store";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";
import { setting } from "@/lib/local/client";
import { usePreferences } from "@/lib/local/preferences-store";
import { loadReciters, selectedReciter } from "@/lib/reciters";

function SpeakerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" strokeLinejoin="round" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" strokeLinecap="round" />
    </svg>
  );
}

export default function ReciterSetting() {
  const lang = langFromPathname(usePathname());
  const online = useOnline();
  const { values } = usePreferences();
  const [list, setList] = useState(null);

  // Asked again after a reconnection, which also recovers from a failed first try.
  useEffect(() => {
    if (!online) return undefined;
    let current = true;
    loadReciters().then((result) => {
      if (current) setList(result);
    });
    return () => {
      current = false;
    };
  }, [online]);

  if (!online || !list || list.status === "hidden") return null;
  return (
    <div className="mx-4 my-4">
      <div className="bg-dua-bg flex flex-row w-full rounded-lg">
        <div className="w-1 rounded-tl-lg rounded-bl-lg"></div>
        <div className="p-2 flex flex-row items-center w-full">
          <div className="bg-icon-bg flex p-2 items-center rounded-full mr-5 justify-center">
            <SpeakerIcon />
          </div>
          <p className="text-start text-base leading-5 style-Kalpurush">{t(lang, "reciterSettings")}</p>
        </div>
      </div>
      <div className="mx-4 mt-3 pb-3">
        {list.status === "ok" ? (
          <>
            <label htmlFor="reciter" className="block text-sm text-muted mb-2">
              {t(lang, "reciterLegend")}
            </label>
            <select
              id="reciter"
              value={selectedReciter(values.reciter_id, list.reciters)}
              onChange={(event) => setting("reciter_id", event.target.value).catch(() => {})}
              className="w-full rounded-md border border-line bg-surface p-2"
            >
              {list.reciters.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.style ? `${r.name} (${r.style})` : r.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p role="status" className="text-sm text-muted">
            {t(lang, "recitersUnavailable")}
          </p>
        )}
      </div>
    </div>
  );
}
