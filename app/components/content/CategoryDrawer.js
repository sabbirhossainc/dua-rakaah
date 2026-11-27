"use client";
// Where the category list sits (design D6). The one list is a sticky column from 1280px; below that the same element
// opens as a sheet from the page intro's "Categories" button, and choosing a category closes it.
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import Button from "@/app/components/ui/Button";
import Sheet from "@/app/components/ui/Sheet";
import { t } from "@/lib/i18n";

/** The width from which the list is a column. The same as Tailwind's `xl` and `.sheet-column` in globals.css. */
export const COLUMN_QUERY = "(min-width: 1280px)";

const DrawerContext = createContext(null);

function subscribeColumn(notify) {
  const query = window.matchMedia(COLUMN_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

const isColumn = () => window.matchMedia(COLUMN_QUERY).matches;

/** `list` is the category list, rendered by the server; `children` is the page beside it. */
export default function CategoryDrawer({ lang, list, children }) {
  const column = useSyncExternalStore(subscribeColumn, isColumn, () => false);
  const [open, setOpen] = useState(false);

  // A screen that grew to the column's width while the sheet was open has no sheet any more.
  useEffect(() => {
    const query = window.matchMedia(COLUMN_QUERY);
    const close = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, []);

  return (
    <DrawerContext.Provider value={{ open, show: () => setOpen(true) }}>
      <Sheet
        open={open && !column}
        onClose={() => setOpen(false)}
        title={t(lang, "categories")}
        closeLabel={t(lang, "sheetClose")}
        lang={lang}
        className="sheet-column"
        // As a column it is part of the page, not a dialog.
        role={column ? "region" : undefined}
      >
        <div
          data-category-list
          onClick={(event) => {
            if (event.target.closest("a")) setOpen(false);
          }}
        >
          {list}
        </div>
      </Sheet>
      {children}
    </DrawerContext.Provider>
  );
}

/** The button that opens the list where it isn't a column. */
export function CategoriesButton({ lang }) {
  const drawer = useContext(DrawerContext);
  return (
    <Button icon="categories" aria-haspopup="dialog" aria-expanded={drawer.open} onClick={drawer.show} className="xl:hidden">
      {t(lang, "categories")}
    </Button>
  );
}
