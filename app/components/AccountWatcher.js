"use client";
// Keeps this device in line with the server's idea of who is signed in, and says when the reader's data was deleted.
// Mounted once, in the root layout, however many account controls a page shows.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Button from "@/app/components/ui/Button";
import Notice from "@/app/components/ui/Notice";
import { getDb } from "@/lib/local/db";
import { getRunner, onRunnerEvent } from "@/lib/local/client";
import {
  completePendingSignOut,
  completeSignIn,
  currentAccount,
  isSignOutPending,
  purgeExpiredKept,
  signOutLocal,
} from "@/lib/local/account";
import { remoteSignOut } from "@/lib/local/remote-sign-out";
import { langFromPathname } from "@/lib/content";
import { t } from "@/lib/i18n";

async function readSession() {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return undefined;
    const session = await res.json();
    return session?.accountId ? { accountId: session.accountId } : null;
  } catch {
    return undefined; // offline: leave things as they are
  }
}

/** Ends the server session of a sign-out that has happened on this device, and syncs once it has. */
export async function finishPendingSignOut() {
  const done = await completePendingSignOut(getDb(), remoteSignOut);
  if (done) getRunner().sync().catch(() => {});
}

export default function AccountWatcher() {
  const lang = langFromPathname(usePathname());
  const [deletedNotice, setDeletedNotice] = useState(false);
  const busy = useRef(false);

  // Brings this device in line with the server's idea of who is signed in (design D8).
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const db = getDb();
      await purgeExpiredKept(db);
      await finishPendingSignOut();
      const session = await readSession();
      const local = await currentAccount(db);
      if (session === undefined || (await isSignOutPending(db))) {
        // The device was cleared meanwhile and the session is about to end, or:
        // Offline or the server did not answer: leave things as they are.
      } else if (session && session.accountId !== local) {
        if (local) await signOutLocal(db, { keepUnsynced: true }); // another account signed in: keep the old one's unsent changes
        await completeSignIn(db, session.accountId);
        getRunner().sync().catch(() => {});
      } else if (!session && local) {
        // The session ended (it expired, or the reader signed out in another tab).
        // If it ended because the account was deleted, this clears the device and tells the reader.
        await getRunner().checkDeleted();
        if ((await currentAccount(db)) === local) await signOutLocal(db, { keepUnsynced: true });
        await finishPendingSignOut();
      }
    } catch (error) {
      console.error("Could not check the account:", error);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (typeof indexedDB === "undefined") return undefined;
    refresh();
    window.addEventListener("online", refresh);
    const stopListening = onRunnerEvent((event) => {
      if (event.type === "signed_out") refresh();
      if (event.type === "deleted") {
        setDeletedNotice(true);
        finishPendingSignOut().catch((error) => console.error("Could not sign out:", error));
      }
    });
    return () => {
      window.removeEventListener("online", refresh);
      stopListening();
    };
  }, [refresh]);

  if (!deletedNotice) return null;
  return (
    <Notice
      tone="success"
      lang={lang}
      actions={
        <Button variant="ghost" onClick={() => setDeletedNotice(false)}>
          {t(lang, "dismiss")}
        </Button>
      }
    >
      {t(lang, "dataDeletedNotice")}
    </Notice>
  );
}
