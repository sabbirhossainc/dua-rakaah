"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { getDb } from "@/lib/local/db";
import { getRunner, onRunnerEvent } from "@/lib/local/client";
import {
  completePendingSignOut,
  completeSignIn,
  currentAccount,
  purgeExpiredKept,
  signOutLocal,
  unsyncedCount,
} from "@/lib/local/account";
import { useAccount } from "@/lib/local/account-store";
import { langFromPathname } from "@/lib/content";
import { fmt, t } from "@/lib/i18n";

// Clears the session cookie and the anonymous-device cookie on the server. Throws when offline, so the sign-out
// stays pending and syncing stays paused until it works (lib/local/account.js).
async function remoteSignOut() {
  const res = await fetch("/api/session/clear", { method: "POST" });
  if (!res.ok) throw new Error("could not clear the device cookie");
  await signOut({ redirect: false });
}

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

export default function AccountControl() {
  const lang = langFromPathname(usePathname());
  const { ready, account } = useAccount(); // read live from the local store, so it also works offline
  const [confirm, setConfirm] = useState(null); // { count } while the unsynced-changes warning is open
  const cancelRef = useRef(null);
  const busy = useRef(false);

  const finishPendingSignOut = useCallback(async () => {
    const done = await completePendingSignOut(getDb(), remoteSignOut);
    if (done) getRunner().sync().catch(() => {});
  }, []);

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
      if (session === undefined) {
        // Offline or the server did not answer: leave things as they are.
      } else if (session && session.accountId !== local) {
        if (local) await signOutLocal(db, { keepUnsynced: true }); // another account signed in: keep the old one's unsent changes
        await completeSignIn(db, session.accountId);
        getRunner().sync().catch(() => {});
      } else if (!session && local) {
        // The session ended (it expired, or the reader signed out in another tab).
        await signOutLocal(db, { keepUnsynced: true });
        await finishPendingSignOut();
      }
    } catch (error) {
      console.error("Could not check the account:", error);
    } finally {
      busy.current = false;
    }
  }, [finishPendingSignOut]);

  useEffect(() => {
    if (typeof indexedDB === "undefined") return undefined;
    refresh();
    window.addEventListener("online", refresh);
    const stopListening = onRunnerEvent((event) => {
      if (event.type === "signed_out") refresh();
    });
    return () => {
      window.removeEventListener("online", refresh);
      stopListening();
    };
  }, [refresh]);

  useEffect(() => {
    if (!confirm) return undefined;
    cancelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setConfirm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);

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
      <button
        type="button"
        onClick={account ? handleSignOut : handleSignIn}
        className="mr-3 rounded-md border border-solid border-[#cccdcf] bg-white px-3 py-1 text-sm hover:bg-icon-bg"
      >
        {t(lang, account ? "signOut" : "signIn")}
      </button>
      {confirm &&
        // In a portal on <body>: the top bar sits in a container with a negative z-index (see app/layout.js),
        // and a dialog inside it would be drawn behind the page.
        createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsynced-warning"
            className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-lg"
          >
            <p id="unsynced-warning">
              {confirm.count === 1 ? t(lang, "unsyncedOne") : fmt(lang, "unsyncedMany", { count: confirm.count })}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-md border border-solid border-[#cccdcf] px-4 py-2"
              >
                {t(lang, "cancel")}
              </button>
              <button
                type="button"
                onClick={() => finishSignOut(true).catch((error) => console.error("Could not sign out:", error))}
                className="rounded-md bg-primary px-4 py-2 text-white"
              >
                {t(lang, "signOutConfirm")}
              </button>
            </div>
          </div>
        </div>,
        document.body
        )}
    </>
  );
}
