// A subcategory heading followed by its duas.
import DuaCard from "@/app/components/content/DuaCard";
import SectionHeading from "@/app/components/ui/SectionHeading";
import { pick } from "@/lib/content";

export default function SubcategorySection({ subcat, duas, category, lang }) {
  if (duas.length === 0) return null;
  const name = pick(subcat, "subcat_name", lang);
  return (
    <section id={`subcat-${subcat.subcat_id}`}>
      {name && <SectionHeading title={name} />}
      <div className="flex flex-col gap-cards">
        {duas.map((dua) => (
          <DuaCard key={dua.id} dua={dua} category={category} lang={lang} />
        ))}
      </div>
    </section>
  );
}
