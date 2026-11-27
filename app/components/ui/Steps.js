// Numbered steps with arrows between them: a column on phones, a row from 768px (design D4). First used by the Raka'ah
// page (phase 6).
import { Icon } from "@/app/components/ui/icons";
import { formatNumber } from "@/lib/prayer/dates";

/** `steps` are `{ title, text? }`, in order. */
export default function Steps({ steps, lang = "en", className = "" }) {
  return (
    <ol className={`flex flex-col gap-cards md:flex-row md:items-start ${className}`}>
      {steps.map((step, i) => (
        <li key={i} className="flex min-w-0 flex-col items-center gap-3 md:flex-1 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-col items-center gap-2 text-center md:flex-1">
            <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-primary text-ui font-semibold text-on-primary">
              {formatNumber(i + 1, lang)}
            </span>
            <span className="text-ui font-semibold text-ink">{step.title}</span>
            {step.text && <span className="text-label text-muted">{step.text}</span>}
          </div>
          {i < steps.length - 1 && <Icon name="arrow" size={20} className="rotate-90 text-gold md:mt-2.5 md:rotate-0" />}
        </li>
      ))}
    </ol>
  );
}
