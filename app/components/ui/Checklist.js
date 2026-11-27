// Rows with a check mark (design D4).
import { Icon } from "@/app/components/ui/icons";

export default function Checklist({ items, className = "" }) {
  return (
    <ul className={`flex flex-col gap-2 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-ui">
          <Icon name="check" size={20} className="mt-0.5 text-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
