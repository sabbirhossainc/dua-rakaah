// The primary navigation (design D6): the same five entries for the header and the bottom bar. Pure.
import { langFromPathname, langPrefix } from "./content.js";

// `path` is the English address; "" is the home page. Settings has none: it opens a panel on the current page.
const ENTRIES = [
  { key: "home", label: "navHome", path: "" },
  { key: "duas", label: "navDuas", path: "/duas" },
  { key: "saved", label: "navSaved", path: "/bookmark" },
  { key: "memorize", label: "navMemorize", path: "/memorize" },
  { key: "settings", label: "navSettings", path: null },
];

/** The page's address without a query, a fragment, a trailing slash or the Bangla prefix. The home page is "". */
function section(pathname) {
  const path = String(pathname ?? "").split(/[?#]/)[0].replace(/\/+$/, "");
  return langFromPathname(path) === "bn" ? path.slice(3) : path;
}

// Every page under /duas belongs to Duas. The other entries are one page each.
function isCurrent(entry, path) {
  if (entry.path === null) return false;
  if (entry.key === "duas") return path === entry.path || path.startsWith(`${entry.path}/`);
  return path === entry.path;
}

/**
 * The entries for the page at `pathname`, in order: `{ key, label, href, current }`. `label` is a key of lib/i18n.js,
 * `href` is in the page's language (null for Settings), and at most one entry is current.
 */
export function navEntries(pathname) {
  const prefix = langPrefix(langFromPathname(pathname));
  const path = section(pathname);
  return ENTRIES.map((entry) => ({
    key: entry.key,
    label: entry.label,
    href: entry.path === null ? null : `${prefix}${entry.path}` || "/",
    current: isCurrent(entry, path),
  }));
}
