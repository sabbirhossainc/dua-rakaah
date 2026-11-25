// The service worker (design D5 to D7). Esbuild bundles this file when `next build` runs the route in
// app/serwist/[path]/route.js, which also fills __SW_MANIFEST with the precache list.
//
// It deliberately does NOT use Serwist's default cache list: that list caches audio files, /api/ responses and
// other origins. The rules below are an allow-list (lib/sw-rules.js). A request that matches none of them
// is not handled by this worker and goes straight to the network.
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";
import { matchImageOrFont, matchNavigation, matchStaticFile } from "../lib/sw-rules.js";

const DAY = 24 * 60 * 60;
const NEXT_STATIC_CACHE = "serwist-next-static";
const IMAGES_FONTS_CACHE = "serwist-images-fonts";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // A new worker waits until the reader accepts the update (components/PwaProvider.js sends SKIP_WAITING).
  skipWaiting: false,
  // The first install takes control of the open page, so offline works without a second visit.
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      // Precached pages are answered before this rule. This one passes everything else through to the
      // network, and a failed load then gets the offline page (see `fallbacks`).
      matcher: matchNavigation,
      handler: new NetworkOnly(),
    },
    {
      // Hashed scripts, styles and fonts that are not in the precache list.
      matcher: matchStaticFile,
      handler: new CacheFirst({
        cacheName: NEXT_STATIC_CACHE,
        plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * DAY })],
      }),
    },
    {
      matcher: matchImageOrFont,
      handler: new StaleWhileRevalidate({
        cacheName: IMAGES_FONTS_CACHE,
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * DAY })],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// A new version starts with empty runtime caches, so nothing from the previous build stays behind. They fill again
// as pages are used. (The precache is replaced by Serwist itself on activation.)
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([NEXT_STATIC_CACHE, IMAGES_FONTS_CACHE].map((name) => caches.delete(name))));
});
