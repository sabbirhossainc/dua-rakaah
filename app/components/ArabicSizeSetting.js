"use client";
// The Arabic text size choice (design D7): a native radio group, so arrow keys, focus and the selected state come from the browser.
import { usePathname } from "next/navigation";
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
    <fieldset className="mx-4 mt-3 pb-3">
      <legend className="text-sm text-muted mb-2">{t(lang, "arabicSizeLegend")}</legend>
      <div className="flex flex-col gap-y-2">
        {OPTIONS.map(([value, key]) => (
          <label key={value} className="flex items-center gap-x-2 cursor-pointer">
            <input
              type="radio"
              name="arabic-size"
              value={value}
              checked={values.arabic_font === value}
              onChange={() => setting("arabic_font", value).catch(() => {})}
              className="accent-primary"
            />
            <span>{t(lang, key)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
