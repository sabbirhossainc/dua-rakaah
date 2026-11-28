"use client";
// The Arabic text size choice (design D7).
import { usePathname } from "next/navigation";
import SegmentedControl from "@/app/components/ui/SegmentedControl";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";
import { usePreferences } from "@/lib/local/preferences-store";
import { setting } from "@/lib/local/client";

const OPTIONS = [
  ["small", "arabicSizeSmall"],
  ["medium", "arabicSizeMedium"],
  ["large", "arabicSizeLarge"],
  ["xlarge", "arabicSizeXlarge"],
];

export default function ArabicSizeSetting() {
  const lang = langFromPathname(usePathname());
  const { values } = usePreferences();
  return (
    <SegmentedControl
      icon="textSize"
      legend={t(lang, "arabicSizeLegend")}
      name="arabic-size"
      value={values.arabic_font}
      onChange={(value) => setting("arabic_font", value).catch(() => {})}
      options={OPTIONS.map(([value, key]) => ({ value, label: t(lang, key) }))}
    />
  );
}
