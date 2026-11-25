import { getSession } from "@/lib/auth";
import { getClient } from "@/lib/turso";
import { handleSync } from "@/lib/sync/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request) {
  return handleSync(request, {
    getClient,
    getSession,
    secret: process.env.ANON_COOKIE_SECRET,
    secure: process.env.NODE_ENV === "production",
  });
}
