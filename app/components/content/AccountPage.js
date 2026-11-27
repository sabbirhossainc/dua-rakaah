import AccountStatus from "@/app/components/AccountStatus";
import DeleteData from "@/app/components/DeleteData";
import Card from "@/app/components/ui/Card";
import PageIntro from "@/app/components/ui/PageIntro";
import Section from "@/app/components/ui/Section";
import SectionHeading from "@/app/components/ui/SectionHeading";
import { t } from "@/lib/i18n";

// The account page for one language. It is static: who the reader is, is only known in the browser.
export default function AccountPage({ lang }) {
  return (
    <div lang={lang}>
      <PageIntro title={t(lang, "accountTitle")} lead={t(lang, "accountIntro")} />
      <Section>
        <div className="flex max-w-[760px] flex-col gap-cards">
          <Card>
            <SectionHeading title={t(lang, "accountStatusTitle")} />
            <AccountStatus lang={lang} />
          </Card>
          <Card>
            <SectionHeading title={t(lang, "deleteData")} />
            <DeleteData lang={lang} />
          </Card>
        </div>
      </Section>
    </div>
  );
}
