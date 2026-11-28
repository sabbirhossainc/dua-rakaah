"use client";
// The light or dark theme choice (design D7).
import { usePathname } from "next/navigation";
import SegmentedControl from "@/app/components/ui/SegmentedControl";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";
import { usePreferences } from "@/lib/local/preferences-store";
import { setting } from "@/lib/local/client";

const OPTIONS = [
  ["light", "appearanceLight", "sun"],
  ["dark", "appearanceDark", "moon"],
];

export default function AppearanceSetting() {
  const lang = langFromPathname(usePathname());
  const { values } = usePreferences();
  return (
    <SegmentedControl
      icon="sun"
      legend={t(lang, "appearanceLegend")}
      name="appearance"
      value={values.theme}
      onChange={(value) => setting("theme", value).catch(() => {})}
      options={OPTIONS.map(([value, key, icon]) => ({ value, icon, label: t(lang, key) }))}
    />
  );
}
