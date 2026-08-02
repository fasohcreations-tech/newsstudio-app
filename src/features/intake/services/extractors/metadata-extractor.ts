import type {
  MetadataExtractionInput,
  MetadataExtractor,
} from "@/features/intake/services/extractors/types";
import type { ExtractedMetadata } from "@/features/intake/types/intake.types";

/**
 * Metadata Extractor — architecture stub.
 * Returns lightweight structural metadata only (no network / AI).
 */
export class StubMetadataExtractor implements MetadataExtractor {
  readonly name = "metadata-extractor" as const;

  async extract(input: MetadataExtractionInput): Promise<ExtractedMetadata> {
    const wordCount = input.content?.body
      ? input.content.body.trim().split(/\s+/).filter(Boolean).length
      : undefined;

    return {
      sourceUrl: input.url ?? undefined,
      contentType: input.sourceTypeCode,
      wordCount,
      extra: {
        ...(input.rawMetadata ?? {}),
        architectureOnly: true,
      },
    };
  }
}
