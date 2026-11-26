"use client";
// The server's side of a sign-out, shared by the top bar and the account page.
import { signOut } from "next-auth/react";

// Clears the session cookie and the anonymous-device cookie on the server. Throws when offline, so the sign-out
// stays pending and syncing stays paused until it works (lib/local/account.js).
export async function remoteSignOut() {
  const res = await fetch("/api/session/clear", { method: "POST" });
  if (!res.ok) throw new Error("could not clear the device cookie");
  await signOut({ redirect: false });
}
