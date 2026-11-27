"use client";
// Whether this device is signed in, with the button that changes it, on the account page.
import AccountControl from "@/app/components/AccountControl";
import { useAccount } from "@/lib/local/account-store";
import { t } from "@/lib/i18n";

export default function AccountStatus({ lang }) {
  const { ready, account } = useAccount();
  return (
    // Keeps its height until the local store has been read.
    <div className="flex min-h-28 flex-col items-start gap-4">
      {ready && <p className="text-reading">{t(lang, account ? "accountSignedIn" : "accountSignedOut")}</p>}
      <AccountControl variant="primary" />
    </div>
  );
}
