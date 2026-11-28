// One card per dua (design D8). A dua stored as several rows renders as several parts in one card.
// Fields with no value in the page language are left out, together with their label.
import DuaAudio from "@/app/components/DuaAudio";
import DuaIcons from "@/app/components/DuaIcons";
import Card from "@/app/components/ui/Card";
import Ornament from "@/app/components/ui/Ornament";
import Tag from "@/app/components/ui/Tag";
import { t } from "@/lib/i18n";

function Labeled({ label, className = "", children }) {
  return (
    <div className="mt-5">
      <p className="text-label text-muted">{label}</p>
      <p className={`mt-1 text-reading whitespace-pre-line ${className}`}>{children}</p>
    </div>
  );
}

/** Between two parts: a star between two rules, so that the parts read as one dua. */
function PartDivider() {
  return (
    <div aria-hidden="true" className="mt-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <Ornament kind="star" size={20} />
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export default function DuaCard({ dua, category, lang }) {
  return (
    <Card
      as="article"
      id={`dua-${dua.id}`}
      // A border and badge that stand out from the card and the page (design D12 of apply-audit-pages-and-feedback).
      className="border-edge!"
      tag={
        <span className="flex w-full items-start justify-between gap-3">
          <Tag variant="outline">{category}</Tag>
          <Ornament kind="star" />
        </span>
      }
    >
      {dua.title && <h3 className="font-heading text-card-title text-ink">{dua.title}</h3>}
      {dua.parts.map((part, i) => (
        <div key={i}>
          {i > 0 && <PartDivider />}
          <div data-dua-part>
            {part.top && <p className="mt-5 text-reading whitespace-pre-line">{part.top}</p>}
            {part.arabic && (
              <p lang="ar" dir="rtl" className="mt-5 text-start text-arabic whitespace-pre-line text-ink">
                {part.arabic}
              </p>
            )}
            {part.audio && <DuaAudio audio={part.audio} lang={lang} />}
            {part.transliteration && (
              <Labeled label={t(lang, "transliteration")} className="italic">
                {part.transliteration}
              </Labeled>
            )}
            {part.translation && <Labeled label={t(lang, "translation")}>{part.translation}</Labeled>}
            {part.bottom && <p className="mt-5 text-reading whitespace-pre-line">{part.bottom}</p>}
            {part.reference && (
              <Labeled label={t(lang, "reference")} className="text-gold-text">
                {part.reference}
              </Labeled>
            )}
          </div>
        </div>
      ))}
      <div className="mt-5 border-t border-line pt-3">
        <DuaIcons duaId={dua.id} lang={lang} />
      </div>
    </Card>
  );
}
