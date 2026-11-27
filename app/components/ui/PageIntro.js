// The top of every page but the home page: its one h1 with the ornament, a lead sentence and an action (design D4, D6).
import Ornament from "@/app/components/ui/Ornament";

export default function PageIntro({ title, lead, action, className = "" }) {
  return (
    <div data-page-intro className={`container-page pt-section ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <h1 className="font-heading text-title wrap-break-word text-ink">{title}</h1>
          <Ornament kind="rule" />
          {lead && <p className="max-w-reading text-reading text-muted">{lead}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
