import { notFound } from "next/navigation";

// An address under /bn that no other route takes. Without this, Next answers it with the English not-found page,
// because only that one handles addresses that match no route.
export default function UnknownBn() {
  notFound();
}
