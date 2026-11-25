import Image from "next/image";
import DuaIcons from "@/app/components/DuaIcons";
import { t } from "@/lib/i18n";

// One card per dua. A dua stored as several rows renders as several parts in one card.
// Fields with no value in the page language are left out, together with their label.
function Labeled({ label, children }) {
  return (
    <div className="mt-5">
      <p className="text-[18px] font-normal text-primary subpixel-antialiased">{label}:</p>
      <p className="mt-1 font-normal whitespace-pre-line">{children}</p>
    </div>
  );
}

export default function DuaCard({ dua, lang }) {
  return (
    <div id={`dua-${dua.id}`} className="bg-surface rounded-lg mb-5 scroll-mt-4">
      <div className="p-6">
        <div className="flex flex-row justify-start items-center">
          <Image
            className="mr-3"
            src="/icons/duacard.svg"
            alt=""
            aria-hidden="true"
            width={24}
            height={24}
          />
          {dua.title && (
            <h3 className="text-primary font-medium">{dua.title}</h3>
          )}
        </div>
        {dua.parts.map((part, i) => (
          <div key={i} className="flex flex-col justify-start items-start">
            <div className="w-full">
              {part.top && (
                <p className="mt-5 text-justify leading-8 font-normal text-[18px] whitespace-pre-line">
                  {part.top}
                </p>
              )}
              {part.arabic && (
                <p
                  lang="ar"
                  dir="rtl"
                  className="mt-5 text-right leading-[calc(var(--arabic-size,28px)*48/28)] font-normal text-[length:var(--arabic-size,28px)] whitespace-pre-line"
                >
                  {part.arabic}
                </p>
              )}
              {part.transliteration && (
                <Labeled label={t(lang, "transliteration")}>{part.transliteration}</Labeled>
              )}
              {part.translation && (
                <Labeled label={t(lang, "translation")}>{part.translation}</Labeled>
              )}
              {part.bottom && (
                <p className="mt-5 text-justify leading-8 font-normal text-[18px] whitespace-pre-line">
                  {part.bottom}
                </p>
              )}
              {part.reference && (
                <Labeled label={t(lang, "reference")}>{part.reference}</Labeled>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-6">
        <DuaIcons duaId={dua.id} lang={lang} />
      </div>
    </div>
  );
}
