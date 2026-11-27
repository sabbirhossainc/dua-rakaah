// A floating bar that says something happened (design D4). It sits above the bottom navigation bar on phones.
import { Icon } from "@/app/components/ui/icons";

const TONES = {
  info: { border: "border-primary", icon: "arrow" },
  success: { border: "border-gold", icon: "check" },
};

export default function Notice({ tone = "info", lang, actions, children }) {
  return (
    <div role="status" lang={lang} className={`notice rounded-card border bg-surface text-ui text-body shadow-sheet ${TONES[tone].border}`}>
      <Icon name={TONES[tone].icon} size={20} className="text-primary" />
      <span className="min-w-0 flex-1 basis-48">{children}</span>
      {actions && <span className="flex flex-wrap justify-end gap-2">{actions}</span>}
    </div>
  );
}
