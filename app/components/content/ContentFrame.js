// The category list and the page content of the duas pages, for one language (design D5): side by side from 1280px.
// `lang` marks the whole area so screen readers and fonts treat Bangla pages as Bangla.
import { Suspense } from "react";
import CategoryDrawer from "@/app/components/content/CategoryDrawer";
import CategoryList from "@/app/components/content/CategoryList";
import CurrentCategory from "@/app/components/content/CurrentCategory";

export default function ContentFrame({ lang, children }) {
  return (
    <div
      lang={lang}
      className="container-page xl:grid xl:grid-cols-[340px_minmax(0,1fr)] xl:has-[.sheet-column-hidden]:grid-cols-1 xl:items-start xl:gap-cards"
    >
      <CategoryDrawer lang={lang} list={<CategoryList lang={lang} />}>
        <div className="content-column min-w-0">{children}</div>
      </CategoryDrawer>
      <Suspense>
        <CurrentCategory />
      </Suspense>
    </div>
  );
}
