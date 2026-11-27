"use client";
// The one Settings panel, opened by either of the navigation's Settings entries (design D6).
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import SettingsPanel from "@/app/components/SettingsPanel";
import Sheet from "@/app/components/ui/Sheet";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";

const SettingsContext = createContext(null);

/** `{ open, show }`: whether the panel is open, and a function that opens it. */
export const useSettings = () => useContext(SettingsContext);

export default function SettingsProvider({ children }) {
  const lang = langFromPathname(usePathname());
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false); // once true, the panel's content stays mounted
  const show = useCallback(() => {
    setOpened(true);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, show }), [open, show]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
      {opened && (
        <Sheet open={open} onClose={close} title={t(lang, "navSettings")} closeLabel={t(lang, "sheetClose")} lang={lang}>
          <SettingsPanel onNavigate={close} />
        </Sheet>
      )}
    </SettingsContext.Provider>
  );
}
