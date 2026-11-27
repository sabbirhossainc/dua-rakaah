// What a page shows when it has nothing to list or has failed: an icon, a heading, a sentence and what to do
// (design D4, D7).
import IconCircle from "@/app/components/ui/IconCircle";
import Ornament from "@/app/components/ui/Ornament";
import { Icon } from "@/app/components/ui/icons";

/** `level` is the heading's level: 1 when the state is the whole page, 2 under a page intro. */
export default function EmptyState({ icon, title, text, actions, level = 2, lang, className = "" }) {
  const Heading = `h${level}`;
  return (
    <div lang={lang} className={`flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-card text-center shadow-card ${className}`}>
      {icon && (
        <IconCircle size={56} variant="gold-tint">
          <Icon name={icon} size={28} />
        </IconCircle>
      )}
      <Heading className={`font-heading text-ink ${level === 1 ? "text-section" : "text-card-title"}`}>{title}</Heading>
      {/* A state that is the whole page opens it like a page intro does. */}
      {level === 1 && <Ornament kind="rule" />}
      {text && <p className="max-w-reading text-reading text-muted">{text}</p>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
