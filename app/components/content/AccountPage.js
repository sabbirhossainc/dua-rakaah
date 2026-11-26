import DeleteData from "@/app/components/DeleteData";
import { t } from "@/lib/i18n";

// The account page for one language. It is static: who the reader is, is only known in the browser.
export default function AccountPage({ lang }) {
  return (
    <div lang={lang} className="w-full max-w-3xl rounded-lg bg-surface p-6">
      <h1 className="mb-5 text-2xl">{t(lang, "accountTitle")}</h1>
      <p className="mb-5">{t(lang, "accountIntro")}</p>
      <DeleteData lang={lang} />
    </div>
  );
}
