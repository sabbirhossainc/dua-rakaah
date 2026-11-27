// A horizontal band of a page: its background, the 1200px container and the section padding (design D4).
import Ornament from "@/app/components/ui/Ornament";

const BANDS = { plain: "", sand: "bg-sand", tint: "bg-tint", emerald: "on-emerald" };

export default function Section({ as: Element = "section", band = "plain", className = "", containerClassName = "", children, ...props }) {
  return (
    <Element className={`relative ${BANDS[band]} ${className}`} {...props}>
      {band === "emerald" && <Ornament kind="lattice" />}
      <div className={`relative container-page py-section ${containerClassName}`}>{children}</div>
    </Element>
  );
}
