// The category list of the duas pages: one row per category, in `cat_id` order, with the grid's icon, name and counts.
// Rendered by the server; the current category is marked in the browser (CurrentCategory).
import Image from "next/image";
import ListCard from "@/app/components/ui/ListCard";
import { getCategories } from "@/lib/db";
import { categoryHref, pick } from "@/lib/content";
import { fmt } from "@/lib/i18n";

export default function CategoryList({ lang }) {
  return (
    <ul className="flex flex-col gap-3">
      {getCategories().map((cat) => (
        <li key={cat.cat_id} id={`cat-${cat.cat_id}`}>
          <ListCard
            href={categoryHref(cat, lang)}
            icon={<Image src={`/images/${cat.cat_icon}.svg`} alt="" width={28} height={28} />}
            title={pick(cat, "cat_name", lang)}
            meta={fmt(lang, "duaCount", { n: cat.dua_count })}
            chevron
          />
        </li>
      ))}
    </ul>
  );
}
