// The small index the bookmark pages carry (design D7): every dua's id, title and category, for one language.
// It lets a page list bookmarks, with titles and working links, with no network. Pure: no database access.
import { categoryHref, groupDuas, pick } from "./content.js";
import { fmt } from "./i18n.js";

/**
 * @param {{ categories: Array<object>, duaRows: Array<object> }} content  Raw rows from lib/db.js.
 * @param {"en" | "bn"} lang
 * @returns {{ categories: Record<number, { name: string, href: string }>, duas: Array<[number, string, number]> }}
 *   `duas` is `[id, title, cat_id]`, one entry per dua (a dua stored as several rows is one entry).
 */
export function buildContentIndex({ categories, duaRows }, lang) {
  const cats = {};
  for (const cat of categories) {
    cats[cat.cat_id] = {
      name: pick(cat, "cat_name", lang) ?? cat.cat_name_en,
      href: categoryHref(cat, lang),
    };
  }
  const duas = groupDuas(duaRows, lang)
    .filter((dua) => Object.hasOwn(cats, dua.cat_id))
    .map((dua) => [dua.id, dua.title ?? fmt(lang, "duaFallback", { n: dua.id }), dua.cat_id]);
  return { categories: cats, duas };
}

/**
 * Joins the reader's bookmarks (newest first) with the index. A bookmark for a dua the content no longer has is
 * left out. Each entry has the title, the category name and the link to the card in its category page.
 */
export function resolveBookmarks(bookmarks, index) {
  const byId = new Map(index.duas.map(([id, title, cat]) => [id, { title, cat }]));
  const out = [];
  for (const bookmark of bookmarks) {
    const dua = byId.get(bookmark.dua_id);
    if (!dua) continue;
    const category = index.categories[dua.cat];
    out.push({
      id: bookmark.dua_id,
      title: dua.title,
      category: category.name,
      href: `${category.href}#dua-${bookmark.dua_id}`,
    });
  }
  return out;
}
