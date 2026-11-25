// What Auth.js keeps about a signed-in reader (user-identity spec: only Google's stable account id).
// Pure functions, so a test can check that no email, name or picture is kept.

/** Builds the token. Anything Auth.js put in it (name, email, picture, sub) is dropped. */
export function jwtCallback({ token, account, profile }) {
  if (account?.provider === "google") {
    const sub = profile?.sub ?? account.providerAccountId;
    return sub ? { accountId: `google:${sub}` } : {};
  }
  return token?.accountId ? { accountId: token.accountId } : {};
}

/** The session object the app sees: the account id and when it ends. */
export function sessionCallback({ session, token }) {
  return { accountId: token?.accountId ?? null, expires: session?.expires };
}
