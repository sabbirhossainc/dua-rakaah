"use client";
// The light or dark theme choice (design D7): a native radio group, so arrow keys, focus and the selected state come from the browser.
import { usePathname } from "next/navigation";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";
import { usePreferences } from "@/lib/local/preferences-store";
import { setting } from "@/lib/local/client";

const OPTIONS = [
  ["light", "appearanceLight"],
  ["dark", "appearanceDark"],
];

export default function AppearanceSetting() {
  const lang = langFromPathname(usePathname());
  const { values } = usePreferences();
  return (
    <fieldset className="mx-4 mt-3 pb-3">
      <legend className="text-sm text-muted mb-2">{t(lang, "appearanceLegend")}</legend>
      <div className="flex flex-col gap-y-2">
        {OPTIONS.map(([value, key]) => (
          <label key={value} className="flex items-center gap-x-2 cursor-pointer">
            <input
              type="radio"
              name="appearance"
              value={value}
              checked={values.theme === value}
              onChange={() => setting("theme", value).catch(() => {})}
              className="accent-primary"
            />
            <span>{t(lang, key)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
