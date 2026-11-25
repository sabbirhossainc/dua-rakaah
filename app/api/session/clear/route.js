import { handleClear } from "@/lib/sync/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request) {
  return handleClear(request, { secure: process.env.NODE_ENV === "production" });
}
