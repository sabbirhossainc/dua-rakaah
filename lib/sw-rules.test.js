import test from "node:test";
import assert from "node:assert/strict";
import { isApi, isAudio, matchImageOrFont, matchNavigation, matchStaticFile } from "./sw-rules.js";

const ORIGIN = "https://app.example";

// Builds the object Serwist passes to a matcher.
function req(path, { method = "GET", mode = "cors", destination = "", origin = ORIGIN } = {}) {
  const url = new URL(path, origin);
  return { request: { method, mode, destination }, url, sameOrigin: url.origin === ORIGIN };
}

const matchers = { matchNavigation, matchStaticFile, matchImageOrFont };
const handled = (ctx) => Object.entries(matchers).filter(([, m]) => m(ctx)).map(([name]) => name);

test("audio files are never handled, on this origin or another, with any method", () => {
  for (const path of ["/audio/12.mp3", "/a/b.m4a", "/x.OGG", "/x.opus", "/x.wav", "/x.flac"]) {
    assert.equal(isAudio(req(path)), true, path);
    assert.deepEqual(handled(req(path)), [], path);
    assert.deepEqual(handled(req(path, { method: "POST" })), [], path);
  }
  const other = req("https://www.hisnmuslim.com/audio/ar/12.mp3", { origin: "https://www.hisnmuslim.com" });
  assert.equal(other.sameOrigin, false);
  assert.deepEqual(handled(other), []);
});

test("a request whose destination is audio or video is never handled, whatever its URL", () => {
  for (const destination of ["audio", "video"]) {
    const ctx = req("/media/stream", { destination });
    assert.equal(isAudio(ctx), true);
    assert.deepEqual(handled(ctx), []);
  }
  // Even a navigation or an image-looking URL is refused when the browser says it is audio.
  assert.deepEqual(handled(req("/cover.png", { destination: "audio" })), []);
  assert.deepEqual(handled(req("/play", { mode: "navigate", destination: "audio" })), []);
});

test("an audio extension is refused even inside /_next/static/ or as a page URL", () => {
  assert.deepEqual(handled(req("/_next/static/media/x.mp3")), []);
  assert.deepEqual(handled(req("/duas/x.mp3", { mode: "navigate" })), []);
});

test("every /api/ request is refused, with any method", () => {
  for (const path of ["/api/anything", "/api/auth/session", "/api/audio/4?reciter=7", "/api"]) {
    assert.equal(isApi(req(path)), true, path);
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      assert.deepEqual(handled(req(path, { method })), [], `${method} ${path}`);
      assert.deepEqual(handled(req(path, { method, mode: "navigate" })), [], `${method} ${path} navigate`);
    }
  }
  assert.equal(isApi(req("/apiary")), false);
  assert.equal(isApi(req("/duas/api/x")), false);
});

test("other origins are never handled", () => {
  const image = req("https://cdn.example/x.png", { origin: "https://cdn.example" });
  const script = req("https://cdn.example/_next/static/a.js", { origin: "https://cdn.example" });
  const page = req("https://elsewhere.example/duas", { origin: "https://elsewhere.example", mode: "navigate" });
  for (const ctx of [image, script, page]) {
    assert.equal(ctx.sameOrigin, false);
    assert.deepEqual(handled(ctx), []);
  }
});

test("a same-origin path that is not a page, script, style, font, image or icon is not handled", () => {
  for (const path of ["/data.json", "/export.csv", "/robots.txt", "/serwist/sw.js", "/_next/data/x/y.json", "/duas?cat=6"]) {
    assert.deepEqual(handled(req(path)), [], path);
  }
});

test("only GET requests are handled", () => {
  assert.deepEqual(handled(req("/icons/home.svg", { method: "POST" })), []);
  assert.deepEqual(handled(req("/duas", { method: "POST", mode: "navigate" })), []);
  assert.deepEqual(handled(req("/_next/static/chunks/a.js", { method: "HEAD" })), []);
});

test("navigations on this origin are handled by the navigation rule only", () => {
  assert.deepEqual(handled(req("/duas/sleep?cat=6", { mode: "navigate" })), ["matchNavigation"]);
  assert.deepEqual(handled(req("/bn/duas", { mode: "navigate" })), ["matchNavigation"]);
  assert.deepEqual(handled(req("/duas/sleep?cat=6")), []); // a fetch of the same URL, not a page load
});

test("hashed scripts, styles and fonts are handled by the static rule only", () => {
  for (const path of ["/_next/static/chunks/0abc.js", "/_next/static/chunks/0abc.css", "/_next/static/media/font.woff2"]) {
    assert.deepEqual(handled(req(path)), ["matchStaticFile"], path);
  }
  assert.deepEqual(handled(req("/_next/static/chunks/0abc.js.map")), []);
});

test("images, icons and fonts outside /_next/static/ are handled by the image rule only", () => {
  for (const path of ["/icons/home.svg", "/images/sleep.svg", "/x.png", "/x.webp", "/f.woff2", "/favicon.ico"]) {
    assert.deepEqual(handled(req(path)), ["matchImageOrFont"], path);
  }
});

test("sync and sign-in routes are never handled, with GET or POST", () => {
  for (const path of ["/api/sync", "/api/auth/session", "/api/auth/callback/google?code=x", "/api/session/clear"]) {
    assert.equal(isApi(req(path)), true, path);
    for (const method of ["GET", "POST"]) {
      assert.deepEqual(handled(req(path, { method })), [], `${method} ${path}`);
      assert.deepEqual(handled(req(path, { method, mode: "navigate" })), [], `${method} ${path} navigate`);
    }
  }
});
