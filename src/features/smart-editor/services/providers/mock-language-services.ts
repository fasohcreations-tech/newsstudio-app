import type {
  SpellCheckService,
  SpellIssue,
  TranslationService,
} from "@/features/smart-editor/services/interfaces/editor-services";

/** Lightweight local stub — replace with dictionary / AI spell providers. */
export class MockSpellCheckService implements SpellCheckService {
  readonly providerId = "mock_spell";
  readonly displayName = "Mock Spell Check";

  private readonly knownBad: Record<string, string[]> = {
    malayalm: ["മലയാളം", "malayalam"],
    keralaa: ["കേരളം", "kerala"],
    goverment: ["government", "സർക്കാർ"],
  };

  async check(text: string): Promise<SpellIssue[]> {
    const issues: SpellIssue[] = [];
    const re = /[A-Za-z\u0D00-\u0D7F]+/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const word = match[0];
      const key = word.toLowerCase();
      if (this.knownBad[key]) {
        issues.push({
          word,
          index: match.index,
          suggestions: this.knownBad[key]!,
        });
      }
    }
    return issues;
  }
}

export class MockTranslationService implements TranslationService {
  readonly providerId = "mock_translation";
  readonly displayName = "Mock Translation";

  async translate(input: {
    text: string;
    source: "ml" | "en" | "auto";
    target: "ml" | "en";
  }) {
    if (input.target === "ml") {
      return {
        text: `${input.text}\n\n[Mock ML translation — wire TranslationService to orchestrator]`,
      };
    }
    return {
      text: `${input.text}\n\n[Mock EN translation — wire TranslationService to orchestrator]`,
    };
  }
}

export const mockSpellCheckService = new MockSpellCheckService();
export const mockTranslationService = new MockTranslationService();
