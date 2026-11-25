// Checks the built service worker's precache list against the content database and the build output
// (design D10). Run after `npm run build`:   npm run check:precache
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LANGS, categoryHref } from "../lib/content.js";
import { FIXED_PAGE_URLS } from "../lib/precache.js";

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WORKER = path.join(ROOT, ".next", "server", "app", "serwist", "sw.js.body");

const STATIC_EXT = /\.(?:js|css|woff2)$/i;
const IMAGE_EXT = /\.(?:svg|png|jpe?g|webp|avif|gif|ico)$/i;
const AUDIO_VIDEO_EXT = /\.(?:mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|mp4|webm)(?:\?|$)/i;

/** The urls of the manifest entries in the built worker. They look like {url:"/x",revision:"y"} or {revision:"y",url:"/x"}. */
export function parseWorker(text) {
  const urls = [];
  for (const m of text.matchAll(/\{(?:url:"([^"]+)",revision:[^}]+|revision:[^,}]+,url:"([^"]+)")\}/g)) urls.push(m[1] ?? m[2]);
  return urls;
}

/**
 * @param {{ urls: string[], categories: Array<{cat_id:number, cat_name_en:string}>, staticFiles: string[], publicFiles: string[] }} input
 *   staticFiles are paths below .next/static, publicFiles are paths below public/, both with forward slashes.
 * @returns {string[]} problems, empty when the list is right
 */
export function checkPrecache({ urls, categories, staticFiles, publicFiles }) {
  const problems = [];
  const have = new Set(urls);
  if (have.size !== urls.length) problems.push("the list has duplicate URLs");

  const expectedCategoryUrls = categories.flatMap((c) => LANGS.map((lang) => categoryHref(c, lang)));
  for (const url of expectedCategoryUrls) if (!have.has(url)) problems.push(`missing category page ${url}`);
  const expected = new Set(expectedCategoryUrls);
  for (const url of urls) if (url.includes("?cat=") && !expected.has(url)) problems.push(`unexpected category page ${url}`);

  for (const url of FIXED_PAGE_URLS) if (!have.has(url)) problems.push(`missing page ${url}`);

  for (const file of staticFiles.filter((f) => STATIC_EXT.test(f))) {
    if (!have.has(`/_next/static/${file}`)) problems.push(`missing build file /_next/static/${file}`);
  }
  for (const file of publicFiles.filter((f) => IMAGE_EXT.test(f))) {
    if (!have.has(`/${file}`)) problems.push(`missing public file /${file}`);
  }

  for (const url of urls) {
    if (AUDIO_VIDEO_EXT.test(url)) problems.push(`audio or video file in the list: ${url}`);
    if (url === "/api" || url.startsWith("/api/")) problems.push(`API route in the list: ${url}`);
  }
  return problems;
}

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

function main() {
  if (!fs.existsSync(WORKER)) {
    console.error(`No built worker at ${path.relative(ROOT, WORKER)}. Run "npm run build" first.`);
    return 1;
  }
  const Database = require("better-sqlite3");
  const db = new Database(path.join(ROOT, "data", "dua_main.sqlite"), { readonly: true });
  const categories = db.prepare("SELECT cat_id, cat_name_en FROM category ORDER BY cat_id").all();
  db.close();

  const urls = parseWorker(fs.readFileSync(WORKER, "utf8"));
  const staticFiles = walk(path.join(ROOT, ".next", "static"));
  const publicFiles = walk(path.join(ROOT, "public"));
  const problems = checkPrecache({ urls, categories, staticFiles, publicFiles });

  // Page entries have no file to measure. Only files from the build output and public/ count toward the size.
  let bytes = 0;
  for (const url of urls) {
    const file = url.startsWith("/_next/static/")
      ? path.join(ROOT, ".next", "static", url.slice("/_next/static/".length))
      : path.join(ROOT, "public", url);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) bytes += fs.statSync(file).size;
  }

  console.log(`precache entries: ${urls.length} (${urls.filter((u) => u.includes("?cat=")).length} category pages)`);
  console.log(`files measured:   ${(bytes / 1024).toFixed(0)} KiB (page entries are not counted: the server renders them)`);
  if (problems.length === 0) {
    console.log("OK: the list matches the database and the build.");
    return 0;
  }
  console.error(`${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
