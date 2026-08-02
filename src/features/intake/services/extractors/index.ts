import { StubURLExtractor } from "@/features/intake/services/extractors/url-extractor";
import { StubRSSReader } from "@/features/intake/services/extractors/rss-reader";
import { StubPDFExtractor } from "@/features/intake/services/extractors/pdf-extractor";
import { StubOCRService } from "@/features/intake/services/extractors/ocr-service";
import { StubAudioTranscriber } from "@/features/intake/services/extractors/audio-transcriber";
import { StubMetadataExtractor } from "@/features/intake/services/extractors/metadata-extractor";
import type {
  AudioTranscriber,
  MetadataExtractor,
  OCRService,
  PDFExtractor,
  RSSReader,
  URLExtractor,
} from "@/features/intake/services/extractors/types";

export type IntakeExtractors = {
  urlExtractor: URLExtractor;
  rssReader: RSSReader;
  pdfExtractor: PDFExtractor;
  ocrService: OCRService;
  audioTranscriber: AudioTranscriber;
  metadataExtractor: MetadataExtractor;
};

/** Default stub registry — replace adapters when integrations land. */
export function createIntakeExtractors(): IntakeExtractors {
  return {
    urlExtractor: new StubURLExtractor(),
    rssReader: new StubRSSReader(),
    pdfExtractor: new StubPDFExtractor(),
    ocrService: new StubOCRService(),
    audioTranscriber: new StubAudioTranscriber(),
    metadataExtractor: new StubMetadataExtractor(),
  };
}

export * from "@/features/intake/services/extractors/types";
