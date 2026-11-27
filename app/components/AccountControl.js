"use client";
// The sign-in or sign-out button, with the warning shown before signing out while changes haven't synced.
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { signIn } from "next-auth/react";
import { finishPendingSignOut } from "@/app/components/AccountWatcher";
import Button from "@/app/components/ui/Button";
import Sheet from "@/app/components/ui/Sheet";
import { getDb } from "@/lib/local/db";
import { getRunner, onRunnerEvent } from "@/lib/local/client";
import { signOutLocal, unsyncedCount } from "@/lib/local/account";
import { useAccount } from "@/lib/local/account-store";
import { langFromPathname } from "@/lib/content";
import { fmt, t } from "@/lib/i18n";

export default function AccountControl({ variant = "outline", className = "" }) {
  const lang = langFromPathname(usePathname());
  const { ready, account } = useAccount(); // read live from the local store, so it also works offline
  const [confirm, setConfirm] = useState(null); // { count } while the unsynced-changes warning is open
  const warningId = useId();

  // A deletion on this device ends the sign-in, so there is nothing left to confirm.
  useEffect(
    () =>
      onRunnerEvent((event) => {
        if (event.type === "deleted") setConfirm(null);
      }),
    [],
  );

  async function handleSignIn() {
    try {
      await getRunner().sync().catch(() => {}); // send what is waiting first, as far as possible
      await signIn("google");
    } catch (error) {
      console.error("Could not start sign-in:", error);
    }
  }

  async function finishSignOut(keepUnsynced) {
    const db = getDb();
    await signOutLocal(db, { keepUnsynced });
    setConfirm(null);
    await finishPendingSignOut();
  }

  async function handleSignOut() {
    try {
      await getRunner().sync().catch(() => {});
      const count = await unsyncedCount(getDb());
      if (count > 0) setConfirm({ count });
      else await finishSignOut(false);
    } catch (error) {
      console.error("Could not sign out:", error);
    }
  }

  if (!ready) return null;
  return (
    <>
      <Button variant={variant} onClick={account ? handleSignOut : handleSignIn} className={`whitespace-nowrap ${className}`}>
        {t(lang, account ? "signOut" : "signIn")}
      </Button>
      <Sheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={t(lang, "signOut")}
        closeLabel={t(lang, "sheetClose")}
        lang={lang}
        role="alertdialog"
        aria-describedby={warningId}
      >
        {confirm && (
          <>
            <p id={warningId} className="text-reading">
              {confirm.count === 1 ? t(lang, "unsyncedOne") : fmt(lang, "unsyncedMany", { count: confirm.count })}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" data-autofocus onClick={() => setConfirm(null)}>
                {t(lang, "cancel")}
              </Button>
              <Button onClick={() => finishSignOut(true).catch((error) => console.error("Could not sign out:", error))}>
                {t(lang, "signOutConfirm")}
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
