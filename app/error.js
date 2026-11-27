"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Button from "@/app/components/ui/Button";
import EmptyState from "@/app/components/ui/EmptyState";
import Section from "@/app/components/ui/Section";
import { langFromPathname, langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

// `retry` fetches the page again and renders it, which `reset` alone does not do for a failure on the server.
export default function Error({ error, retry }) {
  const lang = langFromPathname(usePathname());
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <Section containerClassName="max-w-[760px]!">
      <EmptyState
        lang={lang}
        level={1}
        icon="warning"
        title={t(lang, "errorTitle")}
        text={t(lang, "errorText")}
        actions={
          <>
            <Button onClick={() => retry()}>{t(lang, "tryAgain")}</Button>
            <Button variant="outline" href={langPrefix(lang) || "/"}>
              {t(lang, "goHome")}
            </Button>
          </>
        }
      />
    </Section>
  );
}
