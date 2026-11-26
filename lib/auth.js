// Google sign-in with Auth.js (design D2): JWT sessions, no adapter, no tables.
// The only thing kept about a reader is Google's stable account id (see lib/auth-callbacks.js).
import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { jwtCallback, sessionCallback } from "./auth-callbacks.js";

export const { handlers, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: { jwt: jwtCallback, session: sessionCallback },
});

/** `{ accountId, signedInAt }` for a signed-in reader, otherwise null. The one place the session is read. */
export async function getSession() {
  const session = await auth();
  return session?.accountId ? { accountId: session.accountId, signedInAt: session.signedInAt ?? 0 } : null;
}
