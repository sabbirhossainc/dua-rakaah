"use client";
// Marks the category being shown in the category list, and brings it into view in the column. The list is rendered
// by the server and shared by every duas page; only the address, known here, says which row is current.
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { parseCat } from "@/lib/content";
import { COLUMN_QUERY } from "@/app/components/content/CategoryDrawer";

export default function CurrentCategory() {
  const cat = parseCat(useSearchParams().get("cat"));
  useEffect(() => {
    if (cat === null) return undefined;
    const row = document.getElementById(`cat-${cat}`);
    const link = row?.querySelector("a");
    if (!link) return undefined;
    link.setAttribute("aria-current", "page");
    // Only the column scrolls, never the page.
    const scroller = row.closest("[data-sheet-body]");
    if (scroller && window.matchMedia(COLUMN_QUERY).matches) {
      const box = scroller.getBoundingClientRect();
      const at = row.getBoundingClientRect();
      if (at.bottom > box.bottom) scroller.scrollTop += at.bottom - box.bottom + 8;
      else if (at.top < box.top) scroller.scrollTop -= box.top - at.top + 8;
    }
    return () => link.removeAttribute("aria-current");
  }, [cat]);
  return null;
}
