import {
  IntakeExtractorNotImplementedError,
  type AudioTranscriptionInput,
  type AudioTranscriber,
  type ExtractionResult,
} from "@/features/intake/services/extractors/types";

/**
 * Audio Transcriber — interface stub. No STT in Feature 006.
 */
export class StubAudioTranscriber implements AudioTranscriber {
  readonly name = "audio-transcriber" as const;

  async transcribe(_input: AudioTranscriptionInput): Promise<ExtractionResult> {
    throw new IntakeExtractorNotImplementedError(this.name, "transcribe");
  }
}
