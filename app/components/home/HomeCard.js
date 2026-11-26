import { useId } from "react";

// One card of the home page: a section named by its heading. Used by server and client components.
export default function HomeCard({ title, className = "", children, ...props }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`min-w-0 rounded-lg bg-surface p-5 ${className}`} {...props}>
      <h2 id={titleId} className="home-accent mb-3 text-base font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}
