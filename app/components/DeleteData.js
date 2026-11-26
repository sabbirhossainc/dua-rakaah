"use client";
// The "Delete my data" action with its confirmation (data-deletion spec). It needs a connection.
import { useRef, useState, useSyncExternalStore } from "react";
import { signIn } from "next-auth/react";
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
  const dialogRef = useRef(null);
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState(null); // "deleted" | "signin" | "failed"

  async function confirm() {
    dialogRef.current.close();
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
      <button
        type="button"
        onClick={() => dialogRef.current.showModal()}
        disabled={!ready || !online || working}
        aria-describedby={online ? undefined : "delete-offline"}
        className="rounded-md bg-red-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t(lang, "deleteData")}
      </button>
      {!online && (
        <p id="delete-offline" className="text-sm text-muted">
          {t(lang, "deleteDataOffline")}
        </p>
      )}
      {/* Always there, so that a screen reader announces what appears in it. */}
      <p role="status">{working ? t(lang, "deleteDataWorking") : outcome && t(lang, MESSAGES[outcome])}</p>
      {outcome === "signin" && (
        <button
          type="button"
          onClick={() => signIn("google").catch((error) => console.error("Could not start sign-in:", error))}
          className="rounded-md border border-solid border-line px-4 py-2"
        >
          {t(lang, "signIn")}
        </button>
      )}
      {/* A modal <dialog>: the browser keeps the focus inside it, closes it on Escape and gives the focus back. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="delete-warning"
        className="m-auto max-w-md rounded-lg bg-surface p-6 text-ink shadow-lg backdrop:bg-black/40"
      >
        <p id="delete-warning">{t(lang, "deleteDataWarning")}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current.close()}
            className="rounded-md border border-solid border-line px-4 py-2"
          >
            {t(lang, "cancel")}
          </button>
          <button type="button" onClick={confirm} className="rounded-md bg-red-700 px-4 py-2 text-white">
            {t(lang, "deleteDataConfirm")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
