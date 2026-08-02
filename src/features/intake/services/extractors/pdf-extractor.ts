import {
  IntakeExtractorNotImplementedError,
  type ExtractionResult,
  type PDFExtractor,
  type PdfExtractionInput,
} from "@/features/intake/services/extractors/types";

/**
 * PDF Extractor — interface stub. No PDF parsing in Feature 006.
 */
export class StubPDFExtractor implements PDFExtractor {
  readonly name = "pdf-extractor" as const;

  async extract(_input: PdfExtractionInput): Promise<ExtractionResult> {
    throw new IntakeExtractorNotImplementedError(this.name, "extract");
  }
}
