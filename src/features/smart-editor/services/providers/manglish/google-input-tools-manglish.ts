import type {
  ManglishCandidate,
  ManglishConvertResult,
  ManglishService,
} from "@/features/smart-editor/services/interfaces/editor-services";
import { ruleBasedManglishService } from "@/features/smart-editor/services/providers/manglish/rule-based-manglish";

/**
 * Google Input Tools Malayalam — same engine used by manglish.app /
 * Google എഴുത്ത് ഉപകരണങ്ങൾ (itc=ml-t-i0-und).
 *
 * Browser calls go through our API proxy to avoid CORS and keep the
 * provider swappable via the editor registry.
 */
export class GoogleInputToolsManglishService implements ManglishService {
  readonly providerId = "google_input_tools_ml";
  readonly displayName = "Google Input Tools (Manglish.app format)";

  private cache = new Map<string, ManglishCandidate[]>();

  async suggest(latin: string): Promise<ManglishCandidate[]> {
    const key = latin.trim();
    if (!key || !/[a-zA-Z]/.test(key)) return [];

    const cached = this.cache.get(key.toLowerCase());
    if (cached) return cached;

    try {
      const candidates = await fetchGoogleCandidates(key);
      if (candidates.length > 0) {
        this.cache.set(key.toLowerCase(), candidates);
        // Bound cache
        if (this.cache.size > 200) {
          const first = this.cache.keys().next().value;
          if (first) this.cache.delete(first);
        }
        return candidates;
      }
    } catch {
      // fall through
    }

    return ruleBasedManglishService.suggest(key);
  }

  async convert(latin: string): Promise<ManglishConvertResult> {
    if (/\s/.test(latin)) {
      const parts = latin.split(/(\s+)/);
      const out: string[] = [];
      for (const part of parts) {
        if (/^\s+$/.test(part) || !/[a-zA-Z]/.test(part)) {
          out.push(part);
          continue;
        }
        const c = await this.suggest(part);
        out.push(c[0]?.text ?? part);
      }
      const output = out.join("");
      return { input: latin, output, changed: output !== latin };
    }

    const candidates = await this.suggest(latin);
    const output = candidates[0]?.text ?? latin;
    return {
      input: latin,
      output,
      changed: output !== latin,
      candidates,
    };
  }

  async convertTrailingWord(buffer: string) {
    const match = buffer.match(/^(.*?)([A-Za-z]+)(\s+)$/);
    if (!match) return null;
    const [, before = "", word = "", after = ""] = match;
    const { output } = await this.convert(word);
    if (output === word) return null;
    return { before, converted: output, after };
  }
}

type GoogleInputToolsResponse = [
  string,
  Array<[string, string[], unknown?, { candidate_type?: number[] }?]>,
];

async function fetchGoogleCandidates(
  text: string,
): Promise<ManglishCandidate[]> {
  // Prefer same-origin proxy (works in browser + server)
  const proxyUrl =
    typeof window !== "undefined"
      ? `/api/editor/manglish?text=${encodeURIComponent(text)}&num=8`
      : null;

  if (proxyUrl) {
    const res = await fetch(proxyUrl, { method: "GET" });
    if (!res.ok) throw new Error(`Manglish proxy ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ text: string; score?: number }>;
    };
    return (data.candidates ?? []).map((c, i) => ({
      text: c.text,
      score: c.score ?? 1 - i * 0.02,
      source: "google" as const,
      latin: text,
    }));
  }

  // Server-side direct call
  return requestGoogleInputTools(text, 8);
}

export async function requestGoogleInputTools(
  text: string,
  num = 8,
): Promise<ManglishCandidate[]> {
  const params = new URLSearchParams({
    text,
    itc: "ml-t-i0-und",
    num: String(num),
    cp: "0",
    cs: "1",
    ie: "utf-8",
    oe: "utf-8",
    app: "mediaos",
  });

  const res = await fetch(
    `https://inputtools.google.com/request?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`Google Input Tools HTTP ${res.status}`);
  }

  const payload = (await res.json()) as GoogleInputToolsResponse;
  if (!Array.isArray(payload) || payload[0] !== "SUCCESS") {
    return [];
  }

  const block = payload[1]?.[0];
  const words = block?.[1] ?? [];
    return words
    .filter((w) => typeof w === "string" && w.length > 0)
    .map((w, i) => ({
      text: w,
      score: 1 - i * 0.02,
      source: "google" as const,
      latin: text,
    }));
}

export const googleInputToolsManglishService =
  new GoogleInputToolsManglishService();
