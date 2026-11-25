// Serves /serwist/sw.js (the service worker) and fills in its precache list when `next build` runs.
// Uses @serwist/turbopack, which needs a Route Handler because Turbopack has no plugin hook (design D1).
import { createSerwistRoute } from "@serwist/turbopack";
import { getCategories } from "@/lib/db";
import { computeBuildRevision } from "@/lib/build-revision";
import { buildPrecacheEntries } from "@/lib/precache";

// Build with SW_KILL=1 to ship a worker that removes itself and every saved file from readers' devices (design D9).
// The development server serves it too: a production worker left on the same address replaces itself with it
// the next time it checks for updates, and so stops answering from its saved pages (design D8).
const kill = process.env.SW_KILL === "1" || process.env.NODE_ENV === "development";

// Pages are rendered by the server, so Serwist can't hash them. The revision changes whenever the app or the
// content database changes, which makes devices download the pages again (design D4).
const revision = computeBuildRevision(process.cwd());

// Icons, images and build files come from Serwist's own glob. The extension lists are an allow-list: its
// defaults skip .woff2 fonts and would precache anything put in public/, audio included (design D3).
const IMAGE_EXTENSIONS = "svg,png,jpg,jpeg,webp,avif,gif,ico";
const AUDIO_AND_VIDEO = "**/*.{mp3,m4a,aac,ogg,oga,opus,wav,flac,weba,mp4,webm}";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  kill
    ? {
        swSrc: "app/sw-kill.js",
        globPatterns: [],
        additionalPrecacheEntries: [],
        useNativeEsbuild: true,
      }
    : {
        swSrc: "app/sw.js",
        additionalPrecacheEntries: buildPrecacheEntries({ categories: getCategories(), revision }),
        globPatterns: [".next/static/**/*.{js,css,woff2}", `public/**/*.{${IMAGE_EXTENSIONS}}`],
        globIgnores: [AUDIO_AND_VIDEO],
        useNativeEsbuild: true,
      },
);
