import { handleReciters } from "@/lib/quran/handlers";
import { getRecitations } from "@/lib/quran/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return handleReciters({ service: getRecitations() });
}
