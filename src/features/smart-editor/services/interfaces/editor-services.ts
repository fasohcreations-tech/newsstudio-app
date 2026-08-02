/**
 * Provider-agnostic service contracts for the Smart Malayalam Editor.
 * Implementations (Google STT, Whisper, Azure, Google Input Tools, etc.)
 * plug in via the registry — never hardcode vendors in the editor UI.
 */

export type SpeechLocale = "ml-IN" | "en-IN" | "en-US" | "mixed";

export type SpeechTranscriptChunk = {
  text: string;
  isFinal: boolean;
  confidence?: number;
  locale?: SpeechLocale;
};

export type SpeechSessionHandle = {
  sessionId: string;
  stop: () => Promise<SpeechTranscriptChunk>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
};

export interface SpeechToTextService {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  start(options: {
    locale: SpeechLocale;
    onPartial?: (chunk: SpeechTranscriptChunk) => void;
  }): Promise<SpeechSessionHandle>;
}

export type HandwritingStrokePoint = { x: number; y: number; t: number };
export type HandwritingStroke = HandwritingStrokePoint[];

export type HandwritingRecognitionResult = {
  text: string;
  confidence: number;
  alternatives?: string[];
};

export interface HandwritingRecognitionService {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  recognize(input: {
    strokes: HandwritingStroke[];
    width: number;
    height: number;
    locale?: "ml" | "en";
  }): Promise<HandwritingRecognitionResult>;
}

export type ManglishCandidate = {
  text: string;
  score: number;
  source: "lexicon" | "phonetic" | "passthrough" | "google";
  /** Matched lexicon key when available. */
  latin?: string;
};

export type ManglishConvertResult = {
  input: string;
  output: string;
  changed: boolean;
  candidates?: ManglishCandidate[];
};

export interface ManglishService {
  readonly providerId: string;
  readonly displayName: string;
  /** Convert a Latin token or phrase to Malayalam Unicode. */
  convert(latin: string): Promise<ManglishConvertResult>;
  /** Ranked word options for the current Latin token. */
  suggest(latin: string): Promise<ManglishCandidate[]>;
  /** Convert trailing word in a buffer (typing helper). */
  convertTrailingWord(buffer: string): Promise<{
    before: string;
    converted: string;
    after: string;
  } | null>;
}

export type SpellIssue = {
  word: string;
  index: number;
  suggestions: string[];
};

export interface SpellCheckService {
  readonly providerId: string;
  readonly displayName: string;
  check(text: string, language: "ml" | "en"): Promise<SpellIssue[]>;
}

export interface TranslationService {
  readonly providerId: string;
  readonly displayName: string;
  translate(input: {
    text: string;
    source: "ml" | "en" | "auto";
    target: "ml" | "en";
  }): Promise<{ text: string }>;
}

export type AIEditorTransformRequest = {
  action: string;
  text: string;
  language: "ml" | "en" | "manglish";
  storyId?: string;
  contentObjectId?: string;
  targetLanguage?: "ml" | "en";
};

export type AIEditorTransformResult = {
  text: string;
  jobId: string | null;
};

export interface AIEditorService {
  transform(request: AIEditorTransformRequest): Promise<AIEditorTransformResult>;
}
