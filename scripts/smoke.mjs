// Black-box checks of a running app, one check per scenario in the openspec specs.
//   npm run build && npm start      (in one terminal)
//   npm run smoke                   (in another; BASE_URL defaults to http://localhost:3000)
// Expected values come from data/dua_main.sqlite, not from the app under test.
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { categorySlug } from "../lib/content.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TITLE_SUFFIX = "All Duas Collection";

const db = new Database(fileURLToPath(new URL("../data/dua_main.sqlite", import.meta.url)), { readonly: true });

let passes = 0;
let failures = 0;
function check(name, ok, detail = "") {
  if (ok) passes++;
  else {
    failures++;
    console.log(`FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

async function get(path, headers = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", headers });
  const isRedirect = res.status >= 300 && res.status < 400;
  const body = isRedirect ? "" : await res.text();
  let location = null;
  if (res.headers.get("location")) {
    const u = new URL(res.headers.get("location"), BASE);
    location = u.pathname + u.search;
  }
  return { status: res.status, location, body };
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'" };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#x27|#39);/g, (m) => ENTITIES[m]);
const noScripts = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
const visibleText = (html) => decode(noScripts(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const titleOf = (html) => decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "");
const count = (s, needle) => s.split(needle).length - 1;

const partsIn = (html) => count(html, 'data-dua-part="');

function cardSlice(html, id) {
  const start = html.indexOf(`id="dua-${id}"`);
  if (start < 0) return "";
  const ends = [`id="dua-`, `id="subcat-`]
    .map((n) => html.indexOf(n, start + 1))
    .filter((i) => i > start);
  return html.slice(start, ends.length ? Math.min(...ends) : html.length);
}

// ---- oracle data from the database ----
const categories = db.prepare("SELECT * FROM category ORDER BY cat_id").all();
const expectedDuas = Object.fromEntries(
  categories.map((c) => [c.cat_id, db.prepare("SELECT COUNT(DISTINCT id) n FROM dua WHERE cat_id = ?").get(c.cat_id).n])
);
const subcatsWithDuas = (catId) =>
  db
    .prepare(
      "SELECT s.subcat_id FROM sub_category s WHERE s.cat_id = ? AND EXISTS (SELECT 1 FROM dua d WHERE d.cat_id = s.cat_id AND d.subcat_id = s.subcat_id) ORDER BY s.subcat_id"
    )
    .all(catId)
    .map((r) => r.subcat_id);
const pathFor = (c, lang) => `${lang === "bn" ? "/bn" : ""}/duas/${categorySlug(c.cat_name_en)}?cat=${c.cat_id}`;
const catByName = (name) => categories.find((c) => c.cat_name_en === name);
const sleep = catByName("Sleep");
const morning = catByName("Morning & Evening");

// Nothing from the Quran Foundation belongs in a page: its audio hosts, the invented names of the test stand-in, and
// well-known reciters.
const QURAN_CONTENT = /verses\.quran\.(?:com|foundation)|quranicaudio\.com|qurancdn\.com|Alafasy|Invented Reciter|Reciter Seven/;

// The recordings each category page may mention: those listed for a part whose stored Arabic is still the matched one.
const listed = JSON.parse(fs.readFileSync(new URL("../data/audio-sources.json", import.meta.url), "utf8")).recordings;
function expectedAudio(catId) {
  const urls = new Set();
  for (const r of listed) {
    const row = db.prepare("SELECT cat_id, dua_arabic a FROM dua WHERE id = ? ORDER BY rowid LIMIT 1 OFFSET ?").get(r.dua_id, r.part - 1);
    if (row?.cat_id !== catId || !row.a) continue;
    if (crypto.createHash("sha256").update(row.a).digest("hex") === r.text_sha) for (const c of r.candidates) urls.add(c.url);
  }
  return [...urls].sort();
}

// ---- landing pages ----
for (const lang of ["en", "bn"]) {
  const p = lang === "bn" ? "/bn/duas" : "/duas";
  const r = await get(p);
  check(`${p}: 200`, r.status === 200, `status ${r.status}`);
  const cards = [...r.body.matchAll(/<a[^>]*data-category-card[^>]*>([\s\S]*?)<\/a>/g)];
  check(`${p}: 10 category cards`, cards.length === 10, `found ${cards.length}`);
  const hrefs = [...r.body.matchAll(/<a[^>]*data-category-card[^>]*>/g)].map((m) => decode(/href="([^"]+)"/.exec(m[0])?.[1] ?? ""));
  check(`${p}: cards link to ${lang} category URLs in order`, JSON.stringify(hrefs) === JSON.stringify(categories.map((c) => pathFor(c, lang))), hrefs.join(" "));
  check(`${p}: no dua cards rendered`, !r.body.includes('id="dua-'));
  const key = lang === "bn" ? "cat_name_bn" : "cat_name_en";
  const texts = cards.map((m) => visibleText(m[1]));
  check(`${p}: first and last card names`, texts[0]?.includes(categories[0][key]) && texts[9]?.includes(categories[9][key]), `${texts[0]} | ${texts[9]}`);
  categories.forEach((c, i) => {
    const wanted = lang === "bn" ? `${expectedDuas[c.cat_id]}টি দোয়া` : `${expectedDuas[c.cat_id]} duas`;
    check(`${p}: card ${c.cat_id} shows ${expectedDuas[c.cat_id]} duas`, new RegExp(`(?<![0-9])${wanted}`).test(texts[i] ?? ""), texts[i]);
  });
  check(`${p}: category list link to Toilet`, r.body.includes(`href="${lang === "bn" ? "/bn" : ""}/duas/toilet?cat=9"`));
  check(`${p}: slug for Dua's Importance and Adhaan & Iqamah`, r.body.includes("/duas/duas-importance?cat=1") && r.body.includes("/duas/adhaan-iqamah?cat=10"));
}
{
  const r = await get("/duas");
  const rowIds = [...r.body.matchAll(/id="cat-(\d+)"/g)].map((m) => Number(m[1]));
  check("/duas: category list has categories 1..10", JSON.stringify(rowIds) === JSON.stringify(categories.map((c) => c.cat_id)));
  const cat5 = /href="\/duas\/morning-evening\?cat=5"[\s\S]*?<\/a>/g;
  const anchors = r.body.match(cat5) ?? [];
  check("/duas: Morning & Evening shows 45 (not stored 53)", anchors.length === 2 && anchors.every((a) => /(?<![0-9])45 duas/.test(a) && !/53 duas/.test(a)), `anchors ${anchors.length}`);
  const dc = /href="\/duas\/duas-importance\?cat=1"[\s\S]*?<\/a>/.exec(r.body)?.[0] ?? "";
  check("/duas: Dua's Importance shows 21", /(?<![0-9])21 duas/.test(dc));
}

// ---- every category page, both languages ----
for (const lang of ["en", "bn"]) {
  for (const c of categories) {
    const p = pathFor(c, lang);
    const r = await get(p);
    check(`${p}: 200`, r.status === 200, `status ${r.status}`);
    const html = r.body;
    const name = lang === "bn" ? c.cat_name_bn : c.cat_name_en;
    check(`${p}: title`, titleOf(html) === `${name} | ${TITLE_SUFFIX}`, titleOf(html));
    check(`${p}: ${expectedDuas[c.cat_id]} dua cards`, count(html, 'id="dua-') === expectedDuas[c.cat_id], `found ${count(html, 'id="dua-')}`);
    const subs = [...html.matchAll(/id="subcat-(\d+)"/g)].map((m) => Number(m[1]));
    check(`${p}: subcategory sections in order`, JSON.stringify(subs) === JSON.stringify(subcatsWithDuas(c.cat_id)), subs.join(","));
    const ids = [...noScripts(html).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    check(`${p}: unique ids`, dupes.length === 0, [...new Set(dupes)].join(","));
    check(`${p}: no <audio>, no ihadis.com`, !html.includes("<audio") && !html.includes("ihadis.com"));
    // Anywhere in the page, including the data React sends for the controls, where quotes are escaped.
    const audioUrls = [...new Set(html.match(/https?:\/\/[^"'\\\s<>]*\.mp3/g) ?? [])].sort();
    const wanted = expectedAudio(c.cat_id);
    check(`${p}: exactly the listed recording URLs (${wanted.length})`, JSON.stringify(audioUrls) === JSON.stringify(wanted), `found ${audioUrls.length}`);
    const text = visibleText(html);
    check(`${p}: no "Section: Sections"`, !text.includes("Section: Sections"));
    check(`${p}: no audio control in the server HTML`, !/Play recitation|Recitation: |Full verse recitation|তিলাওয়াত চালান/.test(noScripts(html)));
    check(`${p}: no Quran.com address or reciter name`, !QURAN_CONTENT.test(html), QURAN_CONTENT.exec(html)?.[0]);
    check(`${p}: no null/undefined text`, !/\b(null|undefined)\b/i.test(text), /.{20}\b(null|undefined)\b.{20}/i.exec(text)?.[0] ?? "");
    if (lang === "bn") check(`${p}: lang="bn"`, html.includes('lang="bn"'));
    const arabicTags = [...html.matchAll(/<p[^>]*lang="ar"[^>]*>/g)].map((m) => m[0]);
    check(`${p}: Arabic blocks are rtl`, arabicTags.every((t) => t.includes('dir="rtl"')));
    const rows = db.prepare("SELECT dua_arabic a FROM dua WHERE cat_id = ? AND dua_arabic IS NOT NULL AND trim(dua_arabic) != ''").all(c.cat_id);
    const decoded = decode(html);
    const missing = rows.filter((r2) => !decoded.includes(r2.a));
    check(`${p}: every stored Arabic text appears unchanged (${rows.length})`, missing.length === 0 && arabicTags.length === rows.length, `missing ${missing.length}, blocks ${arabicTags.length}`);
  }
}

// ---- the other saved pages have no audio either ----
for (const p of ["/", "/bn", "/support", "/duas", "/bn/duas", "/offline", "/bookmark", "/bn/bookmark", "/memorize", "/bn/memorize", "/account", "/bn/account"]) {
  const { body } = await get(p);
  check(`${p}: no <audio>, no ihadis.com, no recording URL`, !body.includes("<audio") && !body.includes("ihadis.com") && !body.includes(".mp3"));
  check(`${p}: no Quran.com address or reciter name`, !QURAN_CONTENT.test(body), QURAN_CONTENT.exec(body)?.[0]);
}

// ---- Quran.com routes: they follow whether the server has credentials, which the reciter list shows ----
{
  const list = await fetch(`${BASE}/api/reciters`);
  const configured = list.status !== 404;
  console.log(`Quran.com source: ${configured ? "set up" : "not set up"} on the server under test`);
  check("/api/reciters: never stored", list.headers.get("cache-control") === "no-store", list.headers.get("cache-control"));
  if (configured) check("/api/reciters: 200 or 503", [200, 503].includes(list.status), `status ${list.status}`);
  const status = async (path) => {
    const r = await fetch(BASE + path);
    check(`${path}: never stored`, r.headers.get("cache-control") === "no-store", r.headers.get("cache-control"));
    return r.status;
  };
  // Refused or unlisted requests never reach the source, so these hold with any credentials.
  for (const path of ["/api/audio/abc/1", "/api/audio/4/0", "/api/audio/4/1?reciter=x"]) {
    const got = await status(path);
    check(`${path}: 400`, got === 400, `status ${got}`);
  }
  const unlisted = await status("/api/audio/999999/1");
  check("/api/audio for an unlisted part: 404", unlisted === 404, `status ${unlisted}`);
  const first = listed.find((r) => r.quran);
  const path = `/api/audio/${first.dua_id}/${first.part}`;
  const got = await status(path);
  check(`${path}: ${configured ? "200 or 503" : "404"}`, configured ? [200, 503].includes(got) : got === 404, `status ${got}`);
}

// ---- specific scenarios ----
{
  const r = await get(pathFor(sleep, "en"));
  const text = visibleText(r.body);
  check("sleep: headings Before sleep then After waking up", text.indexOf("Before sleep") > -1 && text.indexOf("Before sleep") < text.indexOf("After waking up"));
  check('sleep: title is "Sleep | All Duas Collection"', titleOf(r.body) === "Sleep | All Duas Collection");
  check("sleep: anchor dua-200 exists", r.body.includes('id="dua-200"'));
}
{
  const html = (await get(pathFor(morning, "en"))).body;
  const card = cardSlice(html, 123);
  check("dua 123: exactly one card", count(html, 'id="dua-123"') === 1);
  check("dua 123: five parts", partsIn(card) === 5, `parts ${partsIn(card)}`);
  const arabic = db.prepare("SELECT dua_arabic a FROM dua WHERE id = 123 ORDER BY rowid").all().map((x) => x.a);
  const decodedCard = decode(card);
  const positions = [];
  let from = 0;
  for (const a of arabic) {
    const p = decodedCard.indexOf(a, from);
    positions.push(p);
    if (p >= 0) from = p + a.length;
  }
  check("dua 123: five parts appear in stored order", arabic.length === 5 && positions.every((p) => p >= 0), positions.join(","));
  check("dua 123: 45 cards on category 5", count(html, 'id="dua-') === 45);
}
{
  const arabic4 = db.prepare("SELECT dua_arabic a FROM dua WHERE id = 4").get().a;
  const en = await get("/duas/duas-importance?cat=1");
  const card = decode(cardSlice(en.body, 4));
  check("dua 4: one part", partsIn(cardSlice(en.body, 4)) === 1);
  const order = [arabic4, "Iyyaaka", "It is You we worship and It is You we ask for help.", "He whom Allah guides", "Surah Al-Fatihah 1:5"].map((s) => card.indexOf(s));
  check("dua 4: field order arabic, transliteration, translation, closing, reference", order.every((p, i) => p >= 0 && (i === 0 || p > order[i - 1])), order.join(","));
  check("dua 4: title shown", card.includes("Allah's guidance #1"));
  const bn = await get("/bn/duas/duas-importance?cat=1");
  const bnCard = decode(cardSlice(bn.body, 4));
  check("dua 4 (bn): title and reference", bnCard.includes("হিদায়াত বা পথ-নির্দেশনা #১") && bnCard.includes("সূরা আল-ফাতিহা ১:৫"));
  check("dua 4 (bn): Bangla reference label, no English label", bnCard.includes("রেফারেন্স") && !bnCard.includes("Reference:"));
  check("dua 4 (bn): same Arabic as English", bnCard.includes(arabic4));
}
{
  const html = (await get("/duas/time-of-dua?cat=3")).body;
  const card = decode(cardSlice(html, 40));
  check("dua 40: two parts", partsIn(cardSlice(html, 40)) === 2);
  check("dua 40: reference keeps its line break", card.includes("Bukhari: 1145\n[2] Surah Az-Zariyat: 51: 17-18"));
  check("dua 40: line breaks are rendered (whitespace-pre-line)", cardSlice(html, 40).includes("whitespace-pre-line"));
}
{
  // No fallback to the other language: use real rows that have only one language.
  const only = (field, has, lacks) =>
    db.prepare(`SELECT id, cat_id, ${field}_${has} AS v FROM dua WHERE ${field}_${has} IS NOT NULL AND trim(${field}_${has}) != '' AND (${field}_${lacks} IS NULL OR trim(${field}_${lacks}) = '') LIMIT 1`).get();
  for (const [field, has, lacks] of [["bottom", "en", "bn"], ["translation", "bn", "en"]]) {
    const row = only(field, has, lacks);
    if (!row) {
      check(`no-fallback ${field}: a one-language row exists`, false);
      continue;
    }
    const cat = categories.find((c) => c.cat_id === row.cat_id);
    const haveP = pathFor(cat, has);
    const lackP = pathFor(cat, lacks);
    const [haveHtml, lackHtml] = [decode((await get(haveP)).body), decode((await get(lackP)).body)];
    check(`no-fallback ${field}: ${has} page of dua ${row.id} shows it`, haveHtml.includes(row.v.trim().split("\n")[0]));
    check(`no-fallback ${field}: ${lacks} page of dua ${row.id} does not`, !lackHtml.includes(row.v.trim().split("\n")[0]));
  }
}

// ---- the home page: the same HTML for everyone, with nothing that depends on the reader's time or place ----
{
  const picks = JSON.parse(fs.readFileSync(new URL("../data/home-picks.json", import.meta.url), "utf8"));
  const cards = ["place", "today", "times", "countdown", "duas", "categories", "hadith", "donation"];
  // Two digits, a colon and two digits, in Latin or Bangla digits: what a prayer time or the clock looks like.
  const timeValue = /[0-9\u09E6-\u09EF]{2}:[0-9\u09E6-\u09EF]{2}/;
  for (const [path, lang, place] of [["/", "en", "Dhaka"], ["/bn", "bn", "ঢাকা"]]) {
    const r = await get(path);
    const html = noScripts(r.body);
    const text = visibleText(r.body);
    const prefix = lang === "bn" ? "/bn" : "";
    check(`${path}: 200`, r.status === 200, `status ${r.status}`);
    check(`${path}: indexable`, !/name="robots" content="[^"]*noindex/.test(r.body));
    if (lang === "en") check(`${path}: the site's default title`, titleOf(r.body) === `Dua & Raka'ah | ${TITLE_SUFFIX}`, titleOf(r.body));
    else check(`${path}: a Bangla title with the suffix`, /^[\u0980-\u09FF ]+ \| /.test(titleOf(r.body)) && titleOf(r.body).endsWith(`| ${TITLE_SUFFIX}`), titleOf(r.body));
    check(`${path}: content area lang="${lang}"`, new RegExp(`<div[^>]*lang="${lang}"[^>]*data-home`).test(html));
    const order = [...html.matchAll(/data-home-card="([a-z]+)"/g)].map((m) => m[1]);
    check(`${path}: eight cards in order`, JSON.stringify(order) === JSON.stringify(cards), order.join(","));
    check(`${path}: names the place`, text.includes(place));
    // The band: served with no period, holding the first four cards and none of the others.
    const band = /<div[^>]*data-home-band[^>]*>/.exec(html);
    check(`${path}: the prayer band is served neutral`, band?.[0].includes('data-waqt="neutral"'), band?.[0]);
    const inBand = band ? html.slice(band.index, html.indexOf('data-home-card="duas"')) : "";
    const held = [...inBand.matchAll(/data-home-card="([a-z]+)"/g)].map((m) => m[1]);
    check(`${path}: the band holds the first four cards`, JSON.stringify(held) === JSON.stringify(cards.slice(0, 4)), held.join(","));
    const links = [...html.matchAll(/<a[^>]*data-category-card[^>]*>/g)].map((m) => decode(/href="([^"]+)"/.exec(m[0])?.[1] ?? ""));
    check(`${path}: category links`, JSON.stringify(links) === JSON.stringify(categories.map((c) => pathFor(c, lang))), links.join(" "));
    check(`${path}: donation link to /support`, /data-home-card="donation"[\s\S]*?href="\/support"/.test(html));
    // Without the footer: its verse reference looks like a time.
    const content = visibleText(r.body.replace(/<footer[\s\S]*?<\/footer>/, ""));
    check(`${path}: no prayer time values`, !/<time\b/.test(html) && !timeValue.test(content), timeValue.exec(content)?.[0]);
    check(`${path}: no Hijri date`, !/ AH\b|হিজরি [0-9\u09E6-\u09EF]|[0-9\u09E6-\u09EF]{4} হিজরি/.test(visibleText(html.split('data-home-card="duas"')[0])));
    const duaIds = [...html.matchAll(/data-home-dua="(\d+)"/g)].map((m) => Number(m[1]));
    check(`${path}: every listed dua`, JSON.stringify([...duaIds].sort()) === JSON.stringify([...picks.duas].sort()), duaIds.join(","));
    for (const id of picks.duas) {
      const row = db.prepare("SELECT cat_id FROM dua WHERE id = ?").get(id);
      const c = categories.find((x) => x.cat_id === row.cat_id);
      check(`${path}: dua ${id} links to its card`, decode(html).includes(`href="${pathFor(c, lang)}#dua-${id}"`));
    }
    const quotes = picks.hadith.filter((q) =>
      db.prepare(`SELECT ${q.field}_${lang} AS v FROM dua WHERE id = ? ORDER BY rowid LIMIT 1 OFFSET ?`).get(q.dua_id, q.part - 1)?.v?.trim()
    );
    check(`${path}: every quote in this language (${quotes.length})`, count(html, "data-home-quote=") === quotes.length, `found ${count(html, "data-home-quote=")}`);
    check(`${path}: all duas link`, html.includes(`href="${prefix}/duas"`));
  }
  const pattern = await fetch(BASE + "/images/home-pattern.svg");
  check("the home pattern is served by the app", pattern.status === 200 && /svg/.test(pattern.headers.get("content-type") ?? ""), `status ${pattern.status}`);
  const sheets = [...(await get("/")).body.matchAll(/href="(\/_next\/static\/[^"]+\.css)[^"]*"/g)].map((m) => m[1]);
  const css = (await Promise.all(sheets.map((s) => get(s)))).map((r) => r.body).join("");
  const patternUrls = [...css.matchAll(/url\(["']?([^"')]*home-pattern[^"')]*)/g)].map((m) => m[1]);
  check("the stylesheet takes the pattern from the app's origin", patternUrls.length > 0 && patternUrls.every((u) => u.startsWith("/") && !u.startsWith("//")), `${sheets.length} sheets, ${patternUrls.join(" ")}`);
  check("no duaruqyah.com in the stylesheet", !css.includes("duaruqyah.com"));
}

// ---- redirects and not-found ----
const redirects = [
  ["/duas/morning-&-evening?cat=5", "/duas/morning-evening?cat=5"],
  ["/duas/morning-%26-evening?cat=5", "/duas/morning-evening?cat=5"],
  ["/duas/sleep?cat=5", "/duas/morning-evening?cat=5"],
  ["/duas/sleep", "/duas/sleep?cat=6"],
  ["/bn/duas/sleep?cat=5", "/bn/duas/morning-evening?cat=5"],
  ["/bn/duas/sleep", "/bn/duas/sleep?cat=6"],
  ["/bn/duas/morning-&-evening?cat=5", "/bn/duas/morning-evening?cat=5"],
];
for (const [from, to] of redirects) {
  const r = await get(from);
  check(`${from} -> 308 ${to}`, r.status === 308 && r.location === to, `status ${r.status} location ${r.location}`);
}
for (const p of ["/duas/sleep?cat=99", "/duas/sleep?cat=abc", "/duas/sleep?cat=6&cat=5", "/duas/sleep?cat=", "/duas/not-a-category", "/bn/duas/sleep?cat=99", "/bn/duas/not-a-category"]) {
  const r = await get(p);
  check(`${p} -> 404`, r.status === 404, `status ${r.status}`);
}

// ---- language comes from the URL only ----
{
  const r = await get("/duas/sleep?cat=6", { "Accept-Language": "bn" });
  check("Accept-Language: bn does not change /duas", titleOf(r.body) === "Sleep | All Duas Collection" && !r.body.includes('lang="bn"'));
}

// ---- site shell ----
for (const p of ["/", "/bn", "/duas", "/bn/duas", "/support", "/duas/sleep?cat=6"]) {
  const html = (await get(p)).body;
  const desc = decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "");
  check(`${p}: meta description describes the collection`, /dua/i.test(desc) && !/generated by/i.test(desc), desc);
  const icon = /<link rel="icon" href="([^"]+)"/.exec(html)?.[1] ?? "";
  check(`${p}: favicon on the app origin`, icon.startsWith("/") && !icon.startsWith("//"), icon);
  check(`${p}: no duaruqyah.com asset`, !html.includes("duaruqyah.com"));
  const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? "";
  check(`${p}: <html> has no p-10`, htmlTag !== "" && !/\bp-10\b/.test(htmlTag), htmlTag);
}
const favicon = await fetch(BASE + "/icons/dua-logo.svg");
check("favicon file is served", favicon.status === 200, String(favicon.status));

// ---- bookmark and memorize pages (per-reader data, static, carrying the title index) ----
{
  const titleOf = (id, col) => db.prepare(`SELECT ${col} AS t FROM dua WHERE id = ? AND ${col} IS NOT NULL AND trim(${col}) <> '' ORDER BY rowid LIMIT 1`).get(id)?.t;
  for (const [path, lang, col, heading] of [
    ["/bookmark", "en", "dua_name_en", "Bookmarks"],
    ["/bn/bookmark", "bn", "dua_name_bn", "বুকমার্ক"],
    ["/memorize", "en", "dua_name_en", "Memorize"],
    ["/bn/memorize", "bn", "dua_name_bn", "মুখস্থ"],
  ]) {
    const res = await get(path);
    check(`${path}: 200`, res.status === 200, `status ${res.status}`);
    check(`${path}: noindex`, /name="robots" content="noindex/.test(res.body));
    check(`${path}: heading and language`, res.body.includes(heading) && res.body.includes(`lang="${lang}"`));
    // The page carries a title for every dua, so it can list bookmarks with no network (design D7).
    const sample = [4, 100, 123, 200, 201].map((id) => titleOf(id, col)).filter(Boolean);
    // The page embeds the index as JSON, where "&" and "<" are written as & and <.
    const present = (t) => {
      const json = JSON.stringify(t).slice(1, -1);
      return res.body.includes(json) || res.body.includes(json.replaceAll("&", "\\u0026").replaceAll("<", "\\u003c"));
    };
    const missing = sample.filter((t) => !present(t));
    check(`${path}: carries the title index`, sample.length > 0 && missing.length === 0, `missing: ${missing.join(" | ")}`);
    const prefix = lang === "bn" ? "/bn" : "";
    check(`${path}: the index links into ${prefix}/duas`, res.body.includes(`${prefix}/duas/sleep?cat=6`));
  }
}

// ---- the account page (static; what it does happens in the browser) ----
for (const [path, lang, heading, action] of [
  ["/account", "en", "Your data", "Delete my data"],
  ["/bn/account", "bn", "আপনার ডেটা", "আমার ডেটা মুছুন"],
]) {
  const res = await get(path);
  check(`${path}: 200`, res.status === 200, `status ${res.status}`);
  check(`${path}: noindex`, /name="robots" content="noindex/.test(res.body));
  check(`${path}: heading, action and language`, res.body.includes(heading) && res.body.includes(action) && res.body.includes(`lang="${lang}"`));
}
check("/duas: the page links to the account page", (await get("/duas")).body.includes('href="/account"'));

// ---- the shared frame, on every page (app-navigation and site-shell specs) ----
const FRAME_PAGES = [
  "/", "/bn", "/duas", "/bn/duas", "/support", "/offline", "/bookmark", "/bn/bookmark", "/memorize", "/bn/memorize",
  "/account", "/bn/account", "/no-such-page",
  ...categories.flatMap((c) => [pathFor(c, "en"), pathFor(c, "bn")]),
];
for (const p of FRAME_PAGES) {
  const { body } = await get(p);
  const html = noScripts(body);
  const headings = (html.match(/<h1[\s>]/g) ?? []).length;
  check(`${p}: exactly one h1`, headings === 1, `found ${headings}`);
  check(`${p}: no empty or "#" link`, !/href="#?"/.test(html), /<a[^>]*href="#?"[^>]*>/.exec(html)?.[0]);
  const dead = /href="[^"]*\/(?:rakaah|alldua|dua-info|books)(?:["/?#])/.exec(html);
  check(`${p}: no link to a page that doesn't exist`, !dead, dead?.[0]);
  check(`${p}: no "Duas Page"`, !body.includes("Duas Page"));
  check(`${p}: skip link to the main content`, /<a[^>]*href="#main"/.test(html) && /<main[^>]*id="main"/.test(html));
  check(`${p}: footer`, /<footer[\s>]/.test(html) && /<footer[\s\S]*href="\/support"[\s\S]*<\/footer>/.test(html));
  check(`${p}: no third-party font address`, !/fonts\.(?:googleapis|gstatic)\.com/.test(body));
}

// The header's copy of the navigation. The bottom bar is built from the same function (lib/nav.js).
const headerNav = (html) => /<header[\s\S]*?<nav[^>]*>([\s\S]*?)<\/nav>/.exec(noScripts(html))?.[1] ?? "";
for (const [p, prefix, labels] of [
  ["/", "", ["Home", "Duas", "Saved", "Memorize", "Settings"]],
  ["/bn", "/bn", ["হোম", "দোয়া", "সংরক্ষিত", "মুখস্থ", "সেটিংস"]],
]) {
  const nav = headerNav((await get(p)).body);
  const entries = [...nav.matchAll(/<(a|button)\b[^>]*>[\s\S]*?<\/\1>/g)].map((m) => m[0]);
  const names = entries.map((e) => visibleText(e).trim());
  const links = entries.map((e) => /href="([^"]*)"/.exec(e)?.[1] ?? null);
  check(`${p}: the five navigation entries in order`, JSON.stringify(names) === JSON.stringify(labels), names.join(","));
  const wanted = [prefix || "/", `${prefix}/duas`, `${prefix}/bookmark`, `${prefix}/memorize`, null];
  check(`${p}: navigation links in the page's language`, JSON.stringify(links) === JSON.stringify(wanted), JSON.stringify(links));
}
for (const [p, href] of [[pathFor(sleep, "en"), "/duas"], [pathFor(sleep, "bn"), "/bn/duas"]]) {
  const marked = (headerNav((await get(p)).body).match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? []);
  check(`${p}: only Duas is marked current`, marked.length === 1 && marked[0].includes(`href="${href}"`), marked.join(" "));
}

// ---- the not-found page ----
// /bn addresses reach it through a route that calls notFound(), and Next then leaves the drawing to the browser: the
// response carries the page's content as data, so that is what is read here. The browser check covers the frame.
for (const [p, text, home, duas] of [
  ["/no-such-page", "This page doesn't exist", "/", "/duas"],
  ["/bn/no-such-page", "এই পৃষ্ঠাটি নেই", "/bn", "/bn/duas"],
]) {
  const r = await get(p);
  const main = /<main[^>]*>([\s\S]*)<\/main>/.exec(noScripts(r.body))?.[1] ?? "";
  const data = decode(r.body).replaceAll('\\"', '"');
  const has = (href) => main.includes(`href="${href}"`) || data.includes(`"href":"${href}"`);
  check(`${p}: 404`, r.status === 404, `status ${r.status}`);
  check(`${p}: says the page doesn't exist`, visibleText(main).includes(text) || data.includes(text));
  check(`${p}: links to ${home} and ${duas}`, has(home) && has(duas));
}

// ---- offline support: the service worker file and the offline page ----
{
  const res = await fetch(BASE + "/serwist/sw.js");
  const worker = await res.text();
  check("/serwist/sw.js: 200 JavaScript", res.status === 200 && /javascript/.test(res.headers.get("content-type") ?? ""), `status ${res.status} ${res.headers.get("content-type")}`);
  check("/serwist/sw.js: Service-Worker-Allowed is /", res.headers.get("service-worker-allowed") === "/", String(res.headers.get("service-worker-allowed")));
  const cc = res.headers.get("cache-control") ?? "";
  check("/serwist/sw.js: never cached by the browser", /no-cache/.test(cc) && /no-store/.test(cc), cc);

  const entryUrls = [...worker.matchAll(/\{(?:url:"([^"]+)",revision:[^}]+|revision:[^,}]+,url:"([^"]+)")\}/g)].map((m) => m[1] ?? m[2]);
  const expectedPages = [...categories.flatMap((c) => [pathFor(c, "en"), pathFor(c, "bn")]), "/duas", "/bn/duas", "/", "/bn", "/support", "/offline", "/bookmark", "/bn/bookmark", "/memorize", "/bn/memorize", "/account", "/bn/account"];
  const missing = expectedPages.filter((u) => !entryUrls.includes(u));
  check(`worker precaches all ${expectedPages.length} pages (category pages come from the database)`, missing.length === 0, `missing: ${missing.join(" ")}`);
  check("worker precaches no audio and no /api/ URL", !entryUrls.some((u) => /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)(\?|$)/i.test(u) || u.startsWith("/api/")));
  check("worker precaches the font files", entryUrls.filter((u) => u.endsWith(".woff2")).length > 0);

  const off = await get("/offline");
  check("/offline: 200", off.status === 200, `status ${off.status}`);
  check("/offline: English and Bangla text with links to /duas and /bn/duas", off.body.includes("offline") && off.body.includes("আপনি অফলাইনে আছেন") && off.body.includes('href="/duas"') && off.body.includes('href="/bn/duas"'));
  check("/offline: noindex", /name="robots" content="noindex/.test(off.body));
}

// ---- user data: the sync route and sign-in routes ----
// These need the server to be started with TURSO_DATABASE_URL (for example file:data/user-dev.db) and ANON_COOKIE_SECRET.
{
  const post = (body, raw = false) =>
    fetch(BASE + "/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: raw ? body : JSON.stringify(body) });
  const bad = await post({ anon_id: crypto.randomUUID(), cursor: 0 });
  check("POST /api/sync: a body with no change list is 400", bad.status === 400, `status ${bad.status}`);
  const notJson = await post("nope", true);
  check("POST /api/sync: a body that is not JSON is 400", notJson.status === 400, `status ${notJson.status}`);

  const anon = crypto.randomUUID();
  const good = await post({
    anon_id: anon,
    cursor: 0,
    ops: [{ op_id: crypto.randomUUID(), type: "bookmark", dua_id: 4, fields: { deleted: 0 }, client_ts: Date.now() }],
  });
  const goodBody = await good.json().catch(() => ({}));
  check("POST /api/sync: a first sync is 200 (start the server with TURSO_DATABASE_URL and ANON_COOKIE_SECRET)", good.status === 200, `status ${good.status} ${JSON.stringify(goodBody)}`);
  check("POST /api/sync: the answer is never cached", /no-store/.test(good.headers.get("cache-control") ?? ""), String(good.headers.get("cache-control")));
  check("POST /api/sync: the answer lists the change", goodBody.owner_id === anon && goodBody.rows?.length === 1 && goodBody.rows[0].dua_id === 4);
  const setCookie = good.headers.get("set-cookie") ?? "";
  check("POST /api/sync: sets an HTTP-only signed cookie", /^dua_anon=/.test(setCookie) && /HttpOnly/.test(setCookie), setCookie);
  const guess = await post({ anon_id: anon, cursor: 0, ops: [] });
  check("POST /api/sync: an identifier used by another reader is 403 without its cookie", guess.status === 403, `status ${guess.status}`);

  // Memorize records: accepted, returned only to a request that names the type, validated (data-sync spec).
  const memAnon = crypto.randomUUID();
  const memChange = (fields) => ({ op_id: crypto.randomUUID(), type: "memorize", dua_id: 4, fields, client_ts: Date.now() });
  const mem = await post({
    anon_id: memAnon,
    cursor: 0,
    ops: [memChange({ learned: 0, progress: 50, reset_gen: 0 })],
    types: ["bookmark", "memorize"],
  });
  const memBody = await mem.json().catch(() => ({}));
  check("POST /api/sync: a memorize change is 200 and comes back with its type", mem.status === 200 && memBody.rows?.length === 1 && memBody.rows[0].type === "memorize" && memBody.rows[0].progress === 50, `status ${mem.status} ${JSON.stringify(memBody)}`);
  const memCookie = (mem.headers.get("set-cookie") ?? "").split(";")[0];
  const again = async (extra) => {
    const res = await fetch(BASE + "/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: memCookie },
      body: JSON.stringify({ anon_id: memAnon, cursor: 0, ops: [], ...extra }),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
  const withoutTypes = await again({});
  check("POST /api/sync: a request that names no types gets no memorize row", withoutTypes.status === 200 && withoutTypes.body.rows.every((r) => r.type !== "memorize"), JSON.stringify(withoutTypes.body));
  const withTypes = await again({ types: ["memorize"] });
  check("POST /api/sync: a request that names memorize gets it", withTypes.status === 200 && withTypes.body.rows.length === 1 && withTypes.body.rows[0].progress === 50, JSON.stringify(withTypes.body));
  for (const fields of [{ learned: 0, progress: 101, reset_gen: 0 }, { learned: 2, progress: 50, reset_gen: 0 }, { learned: 0, progress: 50, reset_gen: -1 }]) {
    const res = await post({ anon_id: crypto.randomUUID(), cursor: 0, ops: [memChange(fields)] });
    check(`POST /api/sync: memorize ${JSON.stringify(fields)} is 400`, res.status === 400, `status ${res.status}`);
  }

  // Settings: accepted, returned only to a request that names the type, validated (data-sync spec).
  const prefAnon = crypto.randomUUID();
  const prefChange = (name, value) => ({ op_id: crypto.randomUUID(), type: "preference", pref_key: name, fields: { value, if_absent: 0 }, client_ts: Date.now() });
  const pref = await post({ anon_id: prefAnon, cursor: 0, ops: [prefChange("theme", "dark")], types: ["bookmark", "memorize", "preference"] });
  const prefBody = await pref.json().catch(() => ({}));
  check("POST /api/sync: a setting change is 200 and comes back with its pref_key", pref.status === 200 && prefBody.rows?.length === 1 && prefBody.rows[0].type === "preference" && prefBody.rows[0].pref_key === "theme" && prefBody.rows[0].value === "dark", `status ${pref.status} ${JSON.stringify(prefBody)}`);
  const prefCookie = (pref.headers.get("set-cookie") ?? "").split(";")[0];
  const prefAgain = async (extra) => {
    const res = await fetch(BASE + "/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: prefCookie },
      body: JSON.stringify({ anon_id: prefAnon, cursor: 0, ops: [], ...extra }),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
  const prefWithout = await prefAgain({});
  check("POST /api/sync: a request that names no types gets no setting row", prefWithout.status === 200 && prefWithout.body.rows.every((r) => r.type !== "preference"), JSON.stringify(prefWithout.body));
  const prefWith = await prefAgain({ types: ["preference"] });
  check("POST /api/sync: a request that names preference gets it", prefWith.status === 200 && prefWith.body.rows.length === 1 && prefWith.body.rows[0].pref_key === "theme", JSON.stringify(prefWith.body));
  for (const [name, value] of [["theme", "blue"], ["not_a_setting", "dark"], ["arabic_font", "huge"]]) {
    const res = await post({ anon_id: crypto.randomUUID(), cursor: 0, ops: [prefChange(name, value)] });
    check(`POST /api/sync: setting ${name}=${value} is 400`, res.status === 400, `status ${res.status}`);
  }

  const providers = await get("/api/auth/providers");
  check("/api/auth/providers: 200 and lists Google", providers.status === 200 && providers.body.includes("google"), `status ${providers.status}`);
  const remove = (headers = {}, body = { scope: "anon", anon_id: crypto.randomUUID() }) =>
    fetch(BASE + "/api/account/delete", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const foreign = await remove({ origin: "https://example.invalid" });
  check("POST /api/account/delete: another site is 403", foreign.status === 403, `status ${foreign.status}`);
  const noSession = await remove({}, { scope: "account", anon_id: crypto.randomUUID() });
  check("POST /api/account/delete: an account without a session is 401", noSession.status === 401, `status ${noSession.status}`);
  const bare = await remove({}, { scope: "anon", anon_id: anon });
  check("POST /api/account/delete: an identifier without its cookie is 403", bare.status === 403, `status ${bare.status}`);
  const own = await remove({ cookie: setCookie.split(";")[0] }, { scope: "anon", anon_id: anon });
  check("POST /api/account/delete: with the cookie it is 200 and clears the cookie", own.status === 200 && /^dua_anon=;/.test(own.headers.get("set-cookie") ?? ""), `status ${own.status}`);
  const gone = await post({ anon_id: anon, cursor: 0, ops: [] });
  check("POST /api/sync: a deleted identifier is 410", gone.status === 410, `status ${gone.status}`);

  const getSync = await get("/api/sync");
  check("GET /api/sync: not allowed", getSync.status === 405, `status ${getSync.status}`);
}

console.log(`\n${passes} passed, ${failures} failed (${BASE})`);
process.exit(failures ? 1 : 0);
