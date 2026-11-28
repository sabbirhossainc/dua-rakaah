// The primary navigation (design D6): the app's services, the same entries for the header and the bottom bar. Saved,
// Memorize and the profile are in the account menu, and Settings is an icon beside it. Pure.
import { langFromPathname, langPrefix } from "./content.js";

// `path` is the English address; "" is the home page. A new service is one more entry here.
const ENTRIES = [
  { key: "home", label: "navHome", path: "" },
  { key: "duas", label: "navDuas", path: "/duas" },
  { key: "rakaah", label: "navRakaah", path: "/rakaah" },
];

// The account menu's links, in the same shape.
const ACCOUNT_ENTRIES = [
  { key: "data", label: "navProfile", path: "/account" },
  { key: "saved", label: "navSaved", path: "/bookmark" },
  { key: "memorize", label: "navMemorize", path: "/memorize" },
];

/** The page's address without a query, a fragment, a trailing slash or the Bangla prefix. The home page is "". */
function section(pathname) {
  const path = String(pathname ?? "").split(/[?#]/)[0].replace(/\/+$/, "");
  return langFromPathname(path) === "bn" ? path.slice(3) : path;
}

// Every page under /duas belongs to Duas. The other entries are one page each.
function isCurrent(entry, path) {
  if (entry.key === "duas") return path === entry.path || path.startsWith(`${entry.path}/`);
  return path === entry.path;
}

/**
 * The entries for the page at `pathname`, in order: `{ key, label, href, current }`. `label` is a key of lib/i18n.js,
 * `href` is in the page's language, and at most one entry is current.
 */
export function navEntries(pathname) {
  return build(ENTRIES, pathname);
}

/** The account menu's entries, in the same shape as navEntries. */
export function accountEntries(pathname) {
  return build(ACCOUNT_ENTRIES, pathname);
}

function build(entries, pathname) {
  const prefix = langPrefix(langFromPathname(pathname));
  const path = section(pathname);
  return entries.map((entry) => ({
    key: entry.key,
    label: entry.label,
    href: `${prefix}${entry.path}` || "/",
    current: isCurrent(entry, path),
  }));
}
