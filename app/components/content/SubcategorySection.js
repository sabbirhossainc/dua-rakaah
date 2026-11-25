import { pick } from "@/lib/content";
import DuaCard from "@/app/components/content/DuaCard";

// A subcategory heading followed by its duas. Replaces the old hard-coded "Section: Sections" bar.
export default function SubcategorySection({ subcat, duas, lang }) {
  if (duas.length === 0) return null;
  const name = pick(subcat, "subcat_name", lang);
  return (
    <section id={`subcat-${subcat.subcat_id}`} className="scroll-mt-4">
      {name && (
        <div className="flex mb-5 flex-row bg-white rounded-lg px-5 py-4 justify-start items-center">
          <h2 className="text-primary font-medium leading-[25px] subpixel-antialiased">
            {name}
          </h2>
        </div>
      )}
      {duas.map((dua) => (
        <DuaCard key={dua.id} dua={dua} lang={lang} />
      ))}
    </section>
  );
}
