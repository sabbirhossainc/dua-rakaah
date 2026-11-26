import { listedVerses } from "@/lib/audio/lookup";
import audioSources from "@/data/audio-sources.json";
import { getDua } from "@/lib/db";
import { handleRecitation } from "@/lib/quran/handlers";
import { getRecitations } from "@/lib/quran/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  return handleRecitation(request, await params, {
    service: getRecitations(),
    versesOf: (duaId, part) => listedVerses(getDua(duaId), audioSources, duaId, part),
  });
}
