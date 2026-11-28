// The browser's own <select>, styled (design D4).
import { useId } from "react";
import { Icon } from "@/app/components/ui/icons";

export default function Select({ label, icon, className = "", children, ...props }) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="flex items-center gap-2 text-label text-muted">
        {icon && <Icon name={icon} size={18} />}
        {label}
      </label>
      <select id={id} className="min-h-11 w-full max-w-full cursor-pointer rounded-tile border border-line bg-surface px-3 text-ui text-ink" {...props}>
        {children}
      </select>
    </div>
  );
}
