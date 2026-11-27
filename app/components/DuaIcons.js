// A dua card's controls below its text: bookmark and memorize. (Each part's audio control sits with its Arabic.)
import BookmarkButton from "@/app/components/BookmarkButton";
import MemorizeButton from "@/app/components/MemorizeButton";

export default function DuaIcons({ duaId, lang = "en" }) {
  return (
    <div className="flex w-full flex-row flex-wrap items-center justify-end gap-2">
      <BookmarkButton duaId={duaId} lang={lang} />
      <MemorizeButton duaId={duaId} lang={lang} />
    </div>
  );
}
