// One tile per category, on the duas landing pages and the home page. No dua content is rendered here.
import Image from "next/image";
import Tag from "@/app/components/ui/Tag";
import Tile from "@/app/components/ui/Tile";
import { getCategories } from "@/lib/db";
import { categoryHref, pick } from "@/lib/content";
import { fmt } from "@/lib/i18n";

export default function CategoryGrid({ lang }) {
  return (
    <div className="grid grid-cols-1 gap-tiles min-[640px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {getCategories().map((cat) => (
        <Tile
          key={cat.cat_id}
          data-category-card
          href={categoryHref(cat, lang)}
          icon={<Image src={`/images/${cat.cat_icon}.svg`} alt="" width={32} height={32} />}
          label={pick(cat, "cat_name", lang)}
          meta={<Tag>{fmt(lang, "duaCount", { n: cat.dua_count })}</Tag>}
        />
      ))}
    </div>
  );
}
