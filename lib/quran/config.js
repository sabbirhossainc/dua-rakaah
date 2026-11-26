// Whether the Quran.com (Quran Foundation) source is set up (design D4, D6). Server and scripts only: these variables
// are never given a NEXT_PUBLIC_ prefix. This is the single test used by the pages, the routes and the build.

export const QF_VARIABLES = Object.freeze(["QF_CLIENT_ID", "QF_CLIENT_SECRET", "QF_OAUTH2_BASE_URL", "QF_API_BASE_URL"]);

/**
 * The four settings, or null unless every one is filled in. There is no default address: a missing one means "not set
 * up", so pre-live credentials can never be sent to production by omission.
 */
export function quranConfig(env = process.env) {
  const [clientId, clientSecret, oauth2BaseUrl, apiBaseUrl] = QF_VARIABLES.map((name) => env[name]?.trim());
  if (!clientId || !clientSecret || !oauth2BaseUrl || !apiBaseUrl) return null;
  return { clientId, clientSecret, oauth2BaseUrl, apiBaseUrl };
}

export const quranConfigured = (env = process.env) => quranConfig(env) !== null;
