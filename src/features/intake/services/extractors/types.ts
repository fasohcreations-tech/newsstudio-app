/**
 * Intake extractor contracts (Feature 006).
 * Architecture only — no scraping, OCR, or transcription implementations.
 */

import type {
  ExtractedContent,
  ExtractedMetadata,
} from "@/features/intake/types/intake.types";

export type ExtractionResult<T = ExtractedContent> = {
  content: T | null;
  metadata: ExtractedMetadata;
  warnings: string[];
  error: string | null;
};

export type UrlExtractionInput = {
  url: string;
  locale?: string;
};

export interface URLExtractor {
  readonly name: "url-extractor";
  validate(url: string): Promise<{ valid: boolean; reason?: string }>;
  extract(input: UrlExtractionInput): Promise<ExtractionResult>;
}

export type RssReadInput = {
  feedUrl: string;
  limit?: number;
};

export type RssFeedItem = {
  title: string;
  link?: string;
  summary?: string;
  publishedAt?: string;
};

export interface RSSReader {
  readonly name: "rss-reader";
  validate(feedUrl: string): Promise<{ valid: boolean; reason?: string }>;
  read(input: RssReadInput): Promise<ExtractionResult<RssFeedItem[]>>;
}

export type PdfExtractionInput = {
  storagePath: string;
  organizationId: string;
};

export interface PDFExtractor {
  readonly name: "pdf-extractor";
  extract(input: PdfExtractionInput): Promise<ExtractionResult>;
}

export type OcrInput = {
  storagePath: string;
  organizationId: string;
  languageHints?: string[];
};

export interface OCRService {
  readonly name: "ocr-service";
  extractText(input: OcrInput): Promise<ExtractionResult>;
}

export type AudioTranscriptionInput = {
  storagePath: string;
  organizationId: string;
  language?: string;
};

export interface AudioTranscriber {
  readonly name: "audio-transcriber";
  transcribe(input: AudioTranscriptionInput): Promise<ExtractionResult>;
}

export type MetadataExtractionInput = {
  sourceTypeCode: string;
  url?: string | null;
  content?: ExtractedContent | null;
  rawMetadata?: Record<string, unknown>;
};

export interface MetadataExtractor {
  readonly name: "metadata-extractor";
  extract(input: MetadataExtractionInput): Promise<ExtractedMetadata>;
}

export class IntakeExtractorNotImplementedError extends Error {
  constructor(service: string, method: string) {
    super(
      `${service}.${method} is not implemented yet. News Intake architecture only.`,
    );
    this.name = "IntakeExtractorNotImplementedError";
  }
}
