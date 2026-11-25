import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const esbuild = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// UpdateBar is JSX and imports "@/lib/i18n", which Node can't load as it is. Bundle it with esbuild first.
// React stays external, and the output goes next to this file so that it can find node_modules.
async function loadUpdateBar(t) {
  const outfile = path.join(ROOT, "scripts", `.update-bar-${process.pid}.tmp.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, "app", "components", "UpdateBar.js")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    loader: { ".js": "jsx" },
    alias: { "@": ROOT },
    external: ["react", "react/jsx-runtime"],
    logLevel: "silent",
  });
  t.after(() => fs.rmSync(outfile, { force: true }));
  return (await import(pathToFileURL(outfile).href)).default;
}

test("the update bar shows English text with a Reload and a Dismiss button", async (t) => {
  const UpdateBar = await loadUpdateBar(t);
  const html = renderToStaticMarkup(React.createElement(UpdateBar, { lang: "en", onReload() {}, onDismiss() {} }));
  assert.match(html, /role="status"/);
  assert.match(html, /lang="en"/);
  assert.match(html, /New content is available\./);
  assert.match(html, />Reload</);
  assert.match(html, />Dismiss</);
});

test("the update bar shows Bangla text for lang bn", async (t) => {
  const UpdateBar = await loadUpdateBar(t);
  const html = renderToStaticMarkup(React.createElement(UpdateBar, { lang: "bn", onReload() {}, onDismiss() {} }));
  assert.match(html, /lang="bn"/);
  assert.match(html, /নতুন কনটেন্ট পাওয়া যাচ্ছে।/);
  assert.match(html, />রিলোড করুন</);
  assert.match(html, />বন্ধ করুন</);
  assert.doesNotMatch(html, /Reload|Dismiss/);
});
