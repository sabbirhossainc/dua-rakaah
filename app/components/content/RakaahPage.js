import Button from "@/app/components/ui/Button";
import PageIntro from "@/app/components/ui/PageIntro";
import { langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

// The Rakaah service is not built yet: this page says so, so the navigation never leads nowhere.
export default function RakaahPage({ lang }) {
  return (
    <div lang={lang}>
      <PageIntro
        title={t(lang, "rakaahTitle")}
        lead={t(lang, "rakaahLead")}
        action={
          <Button variant="outline" href={`${langPrefix(lang)}/duas`} icon="duas">
            {t(lang, "browseDuas")}
          </Button>
        }
      />
    </div>
  );
}
