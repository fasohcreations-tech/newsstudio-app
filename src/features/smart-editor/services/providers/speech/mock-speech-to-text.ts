import type {
  SpeechLocale,
  SpeechSessionHandle,
  SpeechToTextService,
  SpeechTranscriptChunk,
} from "@/features/smart-editor/services/interfaces/editor-services";

/**
 * Mock STT provider — architecture placeholder for Google / Whisper / Azure.
 * Does not call external APIs.
 */
export class MockSpeechToTextService implements SpeechToTextService {
  readonly providerId = "mock_stt";
  readonly displayName = "Mock Speech-to-Text";

  async isAvailable() {
    return true;
  }

  async start(options: {
    locale: SpeechLocale;
    onPartial?: (chunk: SpeechTranscriptChunk) => void;
  }): Promise<SpeechSessionHandle> {
    const sessionId = `mock-stt-${Date.now()}`;
    let cancelled = false;
    let paused = false;
    let ticks = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const sampleByLocale: Record<SpeechLocale, string[]> = {
      "ml-IN": ["ഇന്ന്", "കേരളത്തിൽ", "പ്രധാന", "വാർത്തകൾ"],
      "en-IN": ["Today", "in Kerala", "major", "news updates"],
      "en-US": ["Today", "breaking", "news", "update"],
      mixed: ["Today", "കേരളത്തിൽ", "breaking", "വാർത്ത"],
    };

    const parts = sampleByLocale[options.locale] ?? sampleByLocale.mixed;
    let assembled = "";

    const tick = () => {
      if (cancelled || paused) return;
      const next = parts[ticks % parts.length] ?? "";
      ticks += 1;
      assembled = assembled ? `${assembled} ${next}` : next;
      options.onPartial?.({
        text: assembled,
        isFinal: false,
        confidence: 0.7,
        locale: options.locale,
      });
    };

    timer = setInterval(tick, 900);

    const clear = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    return {
      sessionId,
      async pause() {
        paused = true;
      },
      async resume() {
        paused = false;
      },
      async cancel() {
        cancelled = true;
        clear();
      },
      async stop() {
        cancelled = true;
        clear();
        const finalChunk: SpeechTranscriptChunk = {
          text:
            assembled ||
            (options.locale.startsWith("ml")
              ? "മോക്ക് ശബ്ദ ട്രാൻസ്ക്രിപ്ഷൻ"
              : "Mock voice transcription"),
          isFinal: true,
          confidence: 0.85,
          locale: options.locale,
        };
        options.onPartial?.(finalChunk);
        return finalChunk;
      },
    };
  }
}

export const mockSpeechToTextService = new MockSpeechToTextService();
