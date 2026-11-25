import { t } from "@/lib/i18n";

// The "new content is available" prompt (design D7). Presentational only: PwaProvider decides when to show it.
export default function UpdateBar({ lang, onReload, onDismiss }) {
  return (
    <div
      role="status"
      lang={lang}
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-green-600 bg-white px-4 py-3 text-sm shadow-lg"
    >
      <span>{t(lang, "updateAvailable")}</span>
      <button type="button" onClick={onReload} className="rounded bg-green-600 px-3 py-1 text-white">
        {t(lang, "reload")}
      </button>
      <button type="button" onClick={onDismiss} className="px-2 py-1 text-gray-600">
        {t(lang, "dismiss")}
      </button>
    </div>
  );
}
