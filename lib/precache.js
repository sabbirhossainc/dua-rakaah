// The page entries of the service worker's precache list (design D3). Pure: no database, no file access.
// Icons, images and build files are added by Serwist's own glob (see app/serwist/[path]/route.js).
import { LANGS, categoryHref } from "./content.js";

/** Pages that are saved besides the category pages. */
export const FIXED_PAGE_URLS = ["/duas", "/bn/duas", "/", "/bn", "/support", "/offline", "/bookmark", "/bn/bookmark", "/memorize", "/bn/memorize", "/account", "/bn/account", "/about", "/bn/about", "/privacy-policy", "/bn/privacy-policy", "/terms-of-use", "/bn/terms-of-use", "/general-feedbacks", "/bn/general-feedbacks"];

/**
 * @param {{ categories: Array<{ cat_id: number, cat_name_en: string }>, revision: string }} input
 * @returns {Array<{ url: string, revision: string }>}
 */
export function buildPrecacheEntries({ categories, revision }) {
  const urls = [
    ...categories.flatMap((cat) => LANGS.map((lang) => categoryHref(cat, lang))),
    ...FIXED_PAGE_URLS,
  ];
  const unique = [...new Set(urls)];
  if (unique.length !== urls.length) throw new Error("Duplicate precache URL: two categories share a slug and id");
  return unique.map((url) => ({ url, revision }));
}
