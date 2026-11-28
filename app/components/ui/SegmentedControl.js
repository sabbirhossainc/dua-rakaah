// A choice of one among a few, drawn as a row of pills. They are native radios, so the arrow keys, the focus and the
// selected state come from the browser (design D4). The pills are drawn like `sm` buttons (36px, text-ui), and the
// 4px padding of the row keeps each target 44px high.
import { Icon } from "@/app/components/ui/icons";

/** `options` are `{ value, label, name?, lang?, icon? }`: `name` is what a screen reader hears when `label` is a symbol. */
export default function SegmentedControl({ legend, icon, hideLegend = false, name, options, value, onChange, disabled = false, className = "" }) {
  return (
    <fieldset disabled={disabled} className={`min-w-0 ${className}`}>
      <legend className={hideLegend ? "sr-only" : "mb-2 flex items-center gap-2 text-label text-muted"}>
        {icon && !hideLegend && <Icon name={icon} size={18} />}
        {legend}
      </legend>
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[26px] border border-line bg-surface p-1">
        {options.map((option) => (
          <label
            key={option.value}
            lang={option.lang}
            className="relative flex min-h-9 min-w-9 flex-auto cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-center text-ui font-semibold transition-colors motion-reduce:transition-none whitespace-nowrap text-ink hover:bg-tint has-checked:bg-primary has-checked:text-on-primary has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-3 has-focus-visible:outline-offset-1 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              // Over the whole pill and invisible, so the pill is the target.
              className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
              aria-label={option.name}
            />
            {option.icon && <Icon name={option.icon} size={20} />}
            <span aria-hidden={option.name ? "true" : undefined}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
