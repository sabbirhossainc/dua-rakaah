import Category from "@/app/components/Category";

// The category list on the left and the page content on the right, for one language.
// `lang` marks the whole area so screen readers and fonts treat Bangla pages as Bangla.
export default function ContentFrame({ lang, children }) {
  return (
    <div lang={lang} className="grid grid-cols-8">
      <div className="fixed h-[85.5vh] z-0 lg:top-[134px] lg:w-[350px] xl:w-[350px] 2xl:w-[350px] overflow-hidden rounded-2xl sm:hidden md:block sm:h-screen lg:h-[74vh] bg-white">
        <Category lang={lang} />
      </div>
      <div
        id="scrollDua"
        className="w-full lg:overflow-y-auto lg:col-start-2 xl:w-full xl:col-start-3 xl:col-span-6 mx-5 xl:gap-8 col-start-3"
      >
        {children}
      </div>
    </div>
  );
}
