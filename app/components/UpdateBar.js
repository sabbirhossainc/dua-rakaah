import Button from "@/app/components/ui/Button";
import Notice from "@/app/components/ui/Notice";
import { t } from "@/lib/i18n";

// The "new content is available" prompt (design D7). Presentational only: PwaProvider decides when to show it.
export default function UpdateBar({ lang, onReload, onDismiss }) {
  return (
    <Notice
      tone="info"
      lang={lang}
      actions={
        <>
          <Button onClick={onReload}>{t(lang, "reload")}</Button>
          <Button variant="ghost" onClick={onDismiss}>
            {t(lang, "dismiss")}
          </Button>
        </>
      }
    >
      {t(lang, "updateAvailable")}
    </Notice>
  );
}
