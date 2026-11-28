import { useId } from "react";

// One section of the prayer band. Its heading is for screen readers and the outline: what is in the section explains
// itself to the eye. Text sits on the band in the band's ink; controls go in a `band-panel`.
export default function BandSection({ title, className = "", children, ...props }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`flex min-w-0 flex-col items-center justify-center gap-2 text-center ${className}`} {...props}>
      <h2 id={titleId} className="sr-only">
        {title}
      </h2>
      {children}
    </section>
  );
}
