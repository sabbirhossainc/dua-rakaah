// What Auth.js keeps about a signed-in reader (user-identity spec: only Google's stable account id).
// Pure functions, so a test can check that no email, name or picture is kept.

/**
 * Builds the token. Anything Auth.js put in it (name, email, picture, sub) is dropped.
 * `signedInAt` is the server's time at sign-in: a session that began before the account was deleted is refused
 * (data deletion, design D6). A token from before it was recorded has none.
 */
export function jwtCallback({ token, account, profile }) {
  if (account?.provider === "google") {
    const sub = profile?.sub ?? account.providerAccountId;
    return sub ? { accountId: `google:${sub}`, signedInAt: Date.now() } : {};
  }
  if (!token?.accountId) return {};
  const kept = { accountId: token.accountId };
  if (token.signedInAt !== undefined) kept.signedInAt = token.signedInAt;
  return kept;
}

/** The session object the app sees: the account id, when the reader signed in (0 if unknown) and when it ends. */
export function sessionCallback({ session, token }) {
  return { accountId: token?.accountId ?? null, signedInAt: token?.signedInAt ?? 0, expires: session?.expires };
}
