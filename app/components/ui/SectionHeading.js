// The heading of a titled section: an h2 with the gold ornament under it (design D4).
import Ornament from "@/app/components/ui/Ornament";

const ALIGN = {
  start: { row: "flex-row flex-wrap items-end justify-between", column: "items-start" },
  center: { row: "flex-col items-center text-center", column: "items-center" },
};

export default function SectionHeading({ title, id, align = "start", description, action, className = "" }) {
  return (
    <div className={`mb-heading flex gap-x-4 gap-y-3 ${ALIGN[align].row} ${className}`}>
      <div className={`flex min-w-0 flex-col gap-2 ${ALIGN[align].column}`}>
        <h2 id={id} className="font-heading text-section wrap-break-word text-ink">
          {title}
        </h2>
        <Ornament kind="rule" />
        {description && <p className="max-w-reading text-reading text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
