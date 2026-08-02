import {
  IntakeExtractorNotImplementedError,
  type ExtractionResult,
  type RSSReader,
  type RssFeedItem,
  type RssReadInput,
} from "@/features/intake/services/extractors/types";

/**
 * RSS Reader — interface stub. No feed fetching in Feature 006.
 */
export class StubRSSReader implements RSSReader {
  readonly name = "rss-reader" as const;

  async validate(feedUrl: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const parsed = new URL(feedUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { valid: false, reason: "Feed URL must use http or https." };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: "Invalid feed URL." };
    }
  }

  async read(_input: RssReadInput): Promise<ExtractionResult<RssFeedItem[]>> {
    throw new IntakeExtractorNotImplementedError(this.name, "read");
  }
}
