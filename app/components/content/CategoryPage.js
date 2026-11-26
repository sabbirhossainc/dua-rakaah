import { notFound, permanentRedirect } from "next/navigation";
import {
  categoryHref,
  categorySlug,
  groupBySubcategory,
  groupDuas,
  parseCat,
  pick,
} from "@/lib/content";
import {
  getCategory,
  getCategoryBySlug,
  getDuasByCategory,
  getSubcategories,
} from "@/lib/db";
import { withRecordings } from "@/lib/audio/lookup";
import { quranConfigured } from "@/lib/quran/config";
import audioSources from "@/data/audio-sources.json";
import SubcategorySection from "@/app/components/content/SubcategorySection";

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Decide what a /duas/<slug>?cat=N request means (design D4). `cat` picks the category;
// the slug is cosmetic. Returns { status: "ok" | "redirect" | "notFound", ... }.
async function resolve(lang, params, searchParams) {
  const { slug: rawSlug } = await params;
  const slug = safeDecode(rawSlug);
  const { cat } = await searchParams;

  if (cat === undefined) {
    const bySlug = getCategoryBySlug(slug);
    return bySlug
      ? { status: "redirect", href: categoryHref(bySlug, lang) }
      : { status: "notFound" };
  }

  const catId = parseCat(cat);
  const category = catId === null ? null : getCategory(catId);
  if (!category) return { status: "notFound" };
  if (slug !== categorySlug(category.cat_name_en)) {
    return { status: "redirect", href: categoryHref(category, lang) };
  }
  return { status: "ok", category };
}

export async function generateCategoryMetadata({ lang, params, searchParams }) {
  const result = await resolve(lang, params, searchParams);
  if (result.status !== "ok") return {};
  return { title: pick(result.category, "cat_name", lang) };
}

export default async function CategoryPage({ lang, params, searchParams }) {
  const result = await resolve(lang, params, searchParams);
  if (result.status === "notFound") notFound();
  if (result.status === "redirect") permanentRedirect(result.href);

  const { category } = result;
  const sections = groupBySubcategory(
    getSubcategories(category.cat_id),
    // Read on each request, so the pages and the routes agree on whether Quran.com audio is set up.
    withRecordings(groupDuas(getDuasByCategory(category.cat_id), lang), audioSources, { quran: quranConfigured() })
  );

  return (
    <div className="w-full pb-8">
      {sections.map(({ subcat, duas }) => (
        <SubcategorySection
          key={subcat.subcat_id}
          subcat={subcat}
          duas={duas}
          lang={lang}
        />
      ))}
    </div>
  );
}
