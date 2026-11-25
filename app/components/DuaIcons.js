import Image from "next/image";
import Link from "next/link";
import BookmarkButton from "@/app/components/BookmarkButton";
import MemorizeButton from "@/app/components/MemorizeButton";

// The bookmark and memorize icons are real controls. The other three are still placeholders.
export default function DuaIcons({ duaId, lang = "en" }) {
  const data = [
    {
      id: "1",
      icon: "copy",
      alt: "copy",
      href: "",
    },
    {
      id: "2",
      icon: "bookmarkd",
      alt: "bookmark",
      href: "",
    },
    {
      id: "3",
      icon: "plan",
      alt: "plan",
      href: "",
    },
    {
      id: "4",
      icon: "share",
      alt: "share",
      href: "",
    },
    {
      id: "5",
      icon: "report",
      alt: "report",
      href: "",
    },
  ];
  return (
    <div className="flex w-full flex-row flex-wrap items-center justify-end gap-x-8 gap-y-3 py-6">
      {data.map((item) =>
        item.icon === "bookmarkd" ? (
          <BookmarkButton key={item.id} duaId={duaId} lang={lang} />
        ) : item.icon === "plan" ? (
          <MemorizeButton key={item.id} duaId={duaId} lang={lang} />
        ) : (
        <Link href={item.href} key={item.id}>
          <div className="relative w-6">
            <Image
              className="cursor-pointer"
              src={`/icons/${item.icon}.svg`}
              width={24}
              height={24}
              alt={item.alt}
            />
          </div>
        </Link>
        )
      )}
    </div>
  );
}
