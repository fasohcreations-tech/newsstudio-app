import {
  IntakeExtractorNotImplementedError,
  type ExtractionResult,
  type OCRService,
  type OcrInput,
} from "@/features/intake/services/extractors/types";

/**
 * OCR Service — interface stub. No OCR in Feature 006.
 */
export class StubOCRService implements OCRService {
  readonly name = "ocr-service" as const;

  async extractText(_input: OcrInput): Promise<ExtractionResult> {
    throw new IntakeExtractorNotImplementedError(this.name, "extractText");
  }
}
