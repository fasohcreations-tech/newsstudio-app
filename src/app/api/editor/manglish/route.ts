import { NextResponse } from "next/server";

import { requestGoogleInputTools } from "@/features/smart-editor/services/providers/manglish/google-input-tools-manglish";
import { buildManglishCandidates } from "@/features/smart-editor/services/providers/manglish/rule-based-manglish";

/**
 * Manglish suggest proxy — Google Input Tools (ml-t-i0-und), same format as manglish.app.
 * Falls back to local Mozhi/lexicon if Google is unreachable.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim();
  const num = Math.min(12, Math.max(1, Number(searchParams.get("num") ?? 8) || 8));

  if (!text || text.length > 80 || !/[a-zA-Z]/.test(text)) {
    return NextResponse.json({ candidates: [] });
  }

  try {
    const candidates = await requestGoogleInputTools(text, num);
    if (candidates.length > 0) {
      return NextResponse.json({
        provider: "google_input_tools_ml",
        format: "manglish.app",
        candidates: candidates.map((c) => ({
          text: c.text,
          score: c.score,
          source: c.source,
        })),
      });
    }
  } catch {
    // fallback below
  }

  const fallback = buildManglishCandidates(text).slice(0, num);
  return NextResponse.json({
    provider: "rule_based_manglish",
    format: "fallback",
    candidates: fallback.map((c) => ({
      text: c.text,
      score: c.score,
      source: c.source,
    })),
  });
}
