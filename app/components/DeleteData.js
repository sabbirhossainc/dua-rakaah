"use client";
// The "Delete my data" action with its confirmation (data-deletion spec). It needs a connection.
import { useId, useState, useSyncExternalStore } from "react";
import { signIn } from "next-auth/react";
import Button from "@/app/components/ui/Button";
import Sheet from "@/app/components/ui/Sheet";
import { getDb } from "@/lib/local/db";
import { getRunner } from "@/lib/local/client";
import { completePendingSignOut, deleteMyData } from "@/lib/local/account";
import { useAccount } from "@/lib/local/account-store";
import { remoteSignOut } from "@/lib/local/remote-sign-out";
import { t } from "@/lib/i18n";

const MESSAGES = { deleted: "deleteDataDone", signin: "deleteDataSignIn", failed: "deleteDataFailed" };

function subscribeOnline(notify) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

export default function DeleteData({ lang }) {
  const { ready } = useAccount();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [confirming, setConfirming] = useState(false);
  const warningId = useId();
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState(null); // "deleted" | "signin" | "failed"

  async function confirm() {
    setConfirming(false);
    setWorking(true);
    setOutcome(null);
    try {
      const db = getDb();
      await getRunner().settled(); // a sync already on its way must not arrive after the deletion
      const result = await deleteMyData(db);
      setOutcome(result);
      if (result === "deleted" && (await completePendingSignOut(db, remoteSignOut))) {
        getRunner().sync().catch(() => {});
      }
    } catch (error) {
      console.error("Could not delete the data:", error);
      setOutcome("failed");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <Button
        variant="danger"
        onClick={() => setConfirming(true)}
        disabled={!ready || !online || working}
        aria-describedby={online ? undefined : "delete-offline"}
      >
        {t(lang, "deleteData")}
      </Button>
      {!online && (
        <p id="delete-offline" className="text-label text-muted">
          {t(lang, "deleteDataOffline")}
        </p>
      )}
      {/* Always there, so that a screen reader announces what appears in it. */}
      <p role="status" className="text-ui">
        {working ? t(lang, "deleteDataWorking") : outcome && t(lang, MESSAGES[outcome])}
      </p>
      {outcome === "signin" && (
        <Button variant="outline" onClick={() => signIn("google").catch((error) => console.error("Could not start sign-in:", error))}>
          {t(lang, "signIn")}
        </Button>
      )}
      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t(lang, "deleteData")}
        closeLabel={t(lang, "sheetClose")}
        lang={lang}
        role="alertdialog"
        aria-describedby={warningId}
      >
        <p id={warningId} className="text-reading">
          {t(lang, "deleteDataWarning")}
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" data-autofocus onClick={() => setConfirming(false)}>
            {t(lang, "cancel")}
          </Button>
          <Button variant="danger" onClick={confirm}>
            {t(lang, "deleteDataConfirm")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
