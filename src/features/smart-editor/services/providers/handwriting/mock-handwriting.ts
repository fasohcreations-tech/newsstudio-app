import type {
  HandwritingRecognitionResult,
  HandwritingRecognitionService,
  HandwritingStroke,
} from "@/features/smart-editor/services/interfaces/editor-services";

/**
 * Mock handwriting recognition — swap for Google / MyScript / etc. later.
 */
export class MockHandwritingRecognitionService
  implements HandwritingRecognitionService
{
  readonly providerId = "mock_handwriting";
  readonly displayName = "Mock Handwriting Recognition";

  async isAvailable() {
    return true;
  }

  async recognize(input: {
    strokes: HandwritingStroke[];
    width: number;
    height: number;
    locale?: "ml" | "en";
  }): Promise<HandwritingRecognitionResult> {
    const strokeCount = input.strokes.length;
    if (strokeCount === 0) {
      return { text: "", confidence: 0 };
    }

    const mlSamples = ["മലയാളം", "വാർത്ത", "കേരളം", "ഇന്ന്", "സർക്കാർ"];
    const enSamples = ["news", "today", "Kerala", "report"];
    const pool = input.locale === "en" ? enSamples : mlSamples;
    const pick = pool[strokeCount % pool.length] ?? pool[0]!;

    return {
      text: pick,
      confidence: Math.min(0.95, 0.55 + strokeCount * 0.05),
      alternatives: pool.filter((s) => s !== pick).slice(0, 3),
    };
  }
}

export const mockHandwritingRecognitionService =
  new MockHandwritingRecognitionService();
