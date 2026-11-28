// The visual-theme spec's two automatic checks: text contrast in both themes, and no color set outside the theme.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BAND_PERIODS } from "./prayer/band.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CSS = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the first CSS block that starts with `opening`. */
function block(opening) {
  const start = CSS.indexOf(opening);
  assert.ok(start >= 0, `globals.css has a "${opening}" block`);
  const open = CSS.indexOf("{", start);
  return CSS.slice(open + 1, CSS.indexOf("}", open));
}

const colors = (body) => Object.fromEntries([...body.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]));

const light = colors(block("@theme static"));
// What the dark theme does not redefine keeps its light value, as in the browser.
const THEMES = { light, dark: { ...light, ...colors(block(':root[data-theme="dark"]')) } };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const SURFACES = ["page", "surface", "sand", "tint", "gold-tint", "raised"];

/** `[text, background, required ratio]`. 4.5 is for text, 3 for the focus ring and for large text. */
function pairs(theme) {
  const list = [];
  for (const text of ["ink", "body", "muted", "primary", "gold-text"]) {
    for (const surface of SURFACES) {
      // Dark gold on the pressed color is used only as a fill or for text of 24px and larger (design D2).
      const large = theme === "dark" && text === "primary" && surface === "raised";
      list.push([text, surface, large ? 3 : 4.5]);
    }
  }
  for (const surface of ["page", "surface"]) {
    list.push(["focus", surface, 3], ["danger", surface, 4.5]);
  }
  list.push(["on-primary", "primary", 4.5], ["on-gold", "gold", 4.5]);
  // Borders that must be seen: inputs, dua cards and their badges (design D12 of apply-audit-pages-and-feedback).
  for (const surface of SURFACES) list.push(["edge", surface, 3]);
  // Emerald bands: sand text, gold text, and the gold focus ring they switch to.
  list.push(["on-emerald", "emerald", 4.5], ["gold", "emerald", 4.5]);
  return list;
}

for (const [theme, palette] of Object.entries(THEMES)) {
  test(`${theme} theme: text on the tinted surfaces inside emerald has enough contrast`, () => {
    // Inside emerald the tinted surfaces are the on-gold green, and danger is its light red (.on-emerald).
    const { danger } = colors(block(".on-emerald {"));
    for (const background of [palette.emerald, palette["on-gold"]]) {
      for (const text of [palette["on-emerald"], palette.gold, danger]) {
        assert.ok(contrast(text, background) >= 4.5, `${text} on ${background}: ${contrast(text, background).toFixed(2)}`);
      }
    }
  });

  test(`${theme} theme: every text and focus pair has enough contrast`, () => {
    const failures = [];
    for (const [text, background, needed] of pairs(theme)) {
      assert.ok(palette[text], `${theme}: --color-${text} is a hex value`);
      assert.ok(palette[background], `${theme}: --color-${background} is a hex value`);
      const ratio = contrast(palette[text], palette[background]);
      if (ratio < needed) failures.push(`${text} on ${background}: ${ratio.toFixed(2)} < ${needed}`);
    }
    assert.deepEqual(failures, []);
  });
}

test("the contrast formula gives the known values", () => {
  assert.equal(contrast("#000000", "#ffffff").toFixed(0), "21");
  assert.equal(contrast("#ffffff", "#ffffff"), 1);
});

// ---- the prayer band (design D9) ----

// The channels of `top` at `share` over `bottom`, as the browser draws a translucent color.
const over = (top, bottom, share) =>
  `#${[1, 3, 5]
    .map((i) => Math.round(parseInt(top.slice(i, i + 2), 16) * share + parseInt(bottom.slice(i, i + 2), 16) * (1 - share)))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;

function band(theme, period) {
  const prefix = theme === "dark" ? ':root[data-theme="dark"] ' : "\n";
  const body = block(`${prefix}[data-home-band][data-waqt="${period}"] {`);
  return Object.fromEntries([...body.matchAll(/--band-([a-z]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]));
}

for (const [theme, palette] of Object.entries(THEMES)) {
  test(`${theme} theme: each period's ink reads on both ends of its band`, () => {
    const failures = [];
    for (const period of BAND_PERIODS) {
      const { from, to, ink } = band(theme, period);
      assert.ok(from && to && ink, `${theme} ${period} has its three colors`);
      for (const stop of [from, to]) {
        const ratio = contrast(ink, stop);
        if (ratio < 4.5) failures.push(`${period}: ${ink} on ${stop} is ${ratio.toFixed(2)}`);
      }
    }
    assert.deepEqual(failures, []);
  });

  test(`${theme} theme: text on a panel reads over every period's band`, () => {
    const failures = [];
    for (const period of BAND_PERIODS) {
      const { from, to } = band(theme, period);
      for (const stop of [from, to]) {
        const panel = over(palette.surface, stop, 0.85);
        for (const text of ["ink", "body", "muted"]) {
          const ratio = contrast(palette[text], panel);
          if (ratio < 4.5) failures.push(`${period}: ${text} on ${panel} is ${ratio.toFixed(2)}`);
        }
      }
    }
    assert.deepEqual(failures, []);
  });
}

// ---- no color outside the theme ----

/** The two files that may name colors. */
const ALLOWED = new Set(["app/globals.css", "app/components/ui/icons.js"]);
const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const PALETTE =
  /(?<![\w])(?:text|bg|border(?:-[trblxy])?|ring|outline|fill|stroke|from|via|to|accent|decoration|divide|shadow|caret|placeholder)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?![\w-])|--color-(?:gray|green|red)-\d{2,3}/g;

function sources(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sources(file);
    return /\.(?:jsx?|mjs|css)$/.test(entry.name) ? [file] : [];
  });
}

export function rawColors(text) {
  return [...(text.match(HEX) ?? []), ...(text.match(PALETTE) ?? [])];
}

test("the scan recognizes raw colors and leaves the theme's names alone", () => {
  assert.deepEqual(rawColors('color: "#fff"; #0F7A41 text-gray-400 hover:bg-green-600 text-white bg-black/40'), [
    "#fff", "#0F7A41", "text-gray-400", "bg-green-600", "text-white", "bg-black",
  ]);
  assert.deepEqual(rawColors('href="#main" `#dua-${id}` &#x27; text-gold-text bg-emerald text-on-emerald border-line bg-gold-tint'), []);
});

test("no file in app/ sets a color of its own", () => {
  const found = sources("app")
    .filter((file) => !ALLOWED.has(file))
    .flatMap((file) => {
      const hits = rawColors(fs.readFileSync(path.join(ROOT, file), "utf8"));
      return hits.length ? [`${file}: ${[...new Set(hits)].join(" ")}`] : [];
    });
  assert.deepEqual(found, []);
});
