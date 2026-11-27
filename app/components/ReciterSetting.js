"use client";
// The Quran.com reciter choice in the Settings panel (design D8): a native select, so the keyboard and the selected
// state come from the browser. Hidden offline, on the server, and when the Quran.com source is not set up.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Select from "@/app/components/ui/Select";
import { useOnline } from "@/lib/audio/player-store";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";
import { setting } from "@/lib/local/client";
import { usePreferences } from "@/lib/local/preferences-store";
import { loadReciters, selectedReciter } from "@/lib/reciters";

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
  if (list.status !== "ok") {
    return (
      <p role="status" className="text-label text-muted">
        {t(lang, "recitersUnavailable")}
      </p>
    );
  }
  return (
    <Select
      label={t(lang, "reciterLegend")}
      value={selectedReciter(values.reciter_id, list.reciters)}
      onChange={(event) => setting("reciter_id", event.target.value).catch(() => {})}
    >
      {list.reciters.map((r) => (
        <option key={r.id} value={String(r.id)}>
          {r.style ? `${r.name} (${r.style})` : r.name}
        </option>
      ))}
    </Select>
  );
}
