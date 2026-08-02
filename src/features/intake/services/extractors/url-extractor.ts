import {
  IntakeExtractorNotImplementedError,
  type ExtractionResult,
  type URLExtractor,
  type UrlExtractionInput,
} from "@/features/intake/services/extractors/types";

/**
 * URL Extractor — interface stub. No scraping in Feature 006.
 */
export class StubURLExtractor implements URLExtractor {
  readonly name = "url-extractor" as const;

  async validate(url: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { valid: false, reason: "URL must use http or https." };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: "Invalid URL." };
    }
  }

  async extract(_input: UrlExtractionInput): Promise<ExtractionResult> {
    throw new IntakeExtractorNotImplementedError(this.name, "extract");
  }
}
