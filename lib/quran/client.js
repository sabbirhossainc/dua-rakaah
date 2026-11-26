// The Quran Foundation SDK client (design D6). It holds the client secret and gets and renews access tokens itself.
// Imported only by lib/quran/server.js (the app) and scripts/check-audio.mjs: never by anything the browser loads.
import { createServerClient } from "@quranjs/api/server";

/** @param {NonNullable<ReturnType<typeof import("./config.js").quranConfig>>} config */
export function createQuranClient(config) {
  return createServerClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    services: { gatewayUrl: config.apiBaseUrl, oauth2BaseUrl: config.oauth2BaseUrl },
    // New backend apps get granular scopes. The SDK then asks for content.audio.read only.
    contentScopeMode: "granular",
  });
}
