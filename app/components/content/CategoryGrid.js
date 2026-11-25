import Image from "next/image";
import Link from "next/link";
import { getCategories } from "@/lib/db";
import { categoryHref, pick } from "@/lib/content";
import { t } from "@/lib/i18n";

// The /duas landing page: one card per category. No dua content is rendered here.
export default function CategoryGrid({ lang }) {
  const categories = getCategories();
  return (
    <div className="grid grid-cols-1 gap-5 pb-8 md:grid-cols-2">
      {categories.map((cat) => (
        <Link
          key={cat.cat_id}
          data-category-card
          href={categoryHref(cat, lang)}
          className="group flex flex-row items-center gap-x-4 rounded-lg bg-white p-5 hover:bg-icon-bg"
        >
          <div className="flex h-14 w-14 shrink-0 items-center rounded-lg bg-dua-bg">
            <Image
              src={`/images/${cat.cat_icon}.svg`}
              alt=""
              aria-hidden="true"
              className="p-3"
              width={56}
              height={56}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-black">{pick(cat, "cat_name", lang)}</p>
            <p className="mt-1 text-sm text-gray-400">
              {t(lang, "subcategory")}: {cat.subcat_count}
            </p>
          </div>
          <div className="flex flex-col items-center gap-y-1 border-l-2 border-dua-bg pl-4">
            <p className="text-base font-semibold">{cat.dua_count}</p>
            <p className="text-xs text-gray-400">{t(lang, "duas")}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
