// Which requests the service worker may handle (design D5). Pure functions, so they can be unit-tested
// without a browser. Each matcher takes the object Serwist passes: { request, url, sameOrigin }.
//
// A request that no matcher accepts is not handled by the worker at all and goes to the network as usual.
// That is how audio, /api/ and other origins stay out. Each matcher also checks isAudio and isApi
// itself, so a broad matcher added later keeps the exclusion.

const AUDIO_EXTENSIONS = /\.(?:mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)$/i;
const IMAGE_OR_FONT_EXTENSIONS = /\.(?:svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf)$/i;
const STATIC_EXTENSIONS = /\.(?:js|css|woff2)$/i;

/** True for an audio (or video) request on any origin, whatever the URL looks like. */
export function isAudio({ request, url }) {
  return request.destination === "audio" || request.destination === "video" || AUDIO_EXTENSIONS.test(url.pathname);
}

/** True for anything under /api/, with any method. */
export function isApi({ url }) {
  return url.pathname === "/api" || url.pathname.startsWith("/api/");
}

const isGet = ({ request }) => request.method === "GET";
const allowed = (ctx) => ctx.sameOrigin && !isAudio(ctx) && !isApi(ctx);

/** A page load on this origin. The handler only exists so a failed load reaches the offline fallback. */
export function matchNavigation(ctx) {
  return allowed(ctx) && isGet(ctx) && ctx.request.mode === "navigate";
}

/** Hashed scripts, styles and fonts that Next serves under /_next/static/. */
export function matchStaticFile(ctx) {
  return allowed(ctx) && isGet(ctx) && ctx.url.pathname.startsWith("/_next/static/") && STATIC_EXTENSIONS.test(ctx.url.pathname);
}

/** Images, icons and fonts on this origin that are not under /_next/static/. */
export function matchImageOrFont(ctx) {
  return (
    allowed(ctx) && isGet(ctx) && !ctx.url.pathname.startsWith("/_next/static/") && IMAGE_OR_FONT_EXTENSIONS.test(ctx.url.pathname)
  );
}
