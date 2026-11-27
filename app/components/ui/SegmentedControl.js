// A choice of one among a few, drawn as a row of pills. They are native radios, so the arrow keys, the focus and the
// selected state come from the browser (design D4).

/** `options` are `{ value, label, name?, lang? }`: `name` is what a screen reader hears when `label` is a symbol. */
export default function SegmentedControl({ legend, hideLegend = false, name, options, value, onChange, disabled = false, className = "" }) {
  return (
    <fieldset disabled={disabled} className={`min-w-0 ${className}`}>
      <legend className={hideLegend ? "sr-only" : "mb-2 text-label text-muted"}>{legend}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[26px] border border-line bg-surface p-1">
        {options.map((option) => (
          <label
            key={option.value}
            lang={option.lang}
            className="relative flex min-h-11 min-w-11 flex-auto cursor-pointer items-center justify-center rounded-full px-4 text-center text-label font-semibold whitespace-nowrap text-ink hover:bg-tint has-checked:bg-primary has-checked:text-on-primary has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-3 has-focus-visible:outline-offset-1 has-focus-visible:outline-focus"
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
            <span aria-hidden={option.name ? "true" : undefined}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
