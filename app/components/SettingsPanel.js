"use client";
// The Settings panel's content (design D6): the language, appearance, Arabic size and reciter choices, then the link
// to the reader's data (support is paused: no link to it). It is mounted when Settings is first opened, so nothing in it (the
// reciter list in particular) is fetched before that.
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import AppearanceSetting from "@/app/components/AppearanceSetting";
import ArabicSizeSetting from "@/app/components/ArabicSizeSetting";
import LanguageToggle from "@/app/components/LanguageToggle";
import ReciterSetting from "@/app/components/ReciterSetting";
import ListCard from "@/app/components/ui/ListCard";
import { Icon } from "@/app/components/ui/icons";
import { langFromPathname, langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

/** `onNavigate` is called when a link is followed, so the panel can close. */
export default function SettingsPanel({ onNavigate }) {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);
  const account = `${langPrefix(lang)}/account`;
  return (
    <div className="flex flex-col gap-5">
      <Suspense>
        <LanguageToggle />
      </Suspense>
      <AppearanceSetting />
      <ArabicSizeSetting />
      <ReciterSetting />
      <div className="flex flex-col gap-3">
        <ListCard
          href={account}
          icon={<Icon name="data" />}
          title={t(lang, "accountLink")}
          current={pathname === account}
          chevron
          onClick={onNavigate}
        />
      </div>
    </div>
  );
}
