"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getEditorProviders } from "@/features/smart-editor/services/providers/registry";
import type { EditorSuggestion } from "@/features/smart-editor/types/editor.types";

type SuggestionPanelProps = {
  text: string;
  language: "ml" | "en";
  onApply: (suggestion: EditorSuggestion) => void;
};

const PHRASE_BANK: EditorSuggestion[] = [
  {
    id: "p1",
    kind: "phrase",
    text: "പ്രധാന വാർത്തകൾ",
  },
  {
    id: "p2",
    kind: "phrase",
    text: "തകർപ്പൻ റിപ്പോർട്ട്",
  },
  {
    id: "p3",
    kind: "phrase",
    text: "Breaking developments",
  },
  {
    id: "p4",
    kind: "phrase",
    text: "അധികൃത വൃത്തങ്ങൾ",
  },
];

export function SuggestionPanel({
  text,
  language,
  onApply,
}: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<EditorSuggestion[]>(PHRASE_BANK);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const spell = getEditorProviders().spellCheck;
      const issues = await spell.check(text, language);
      if (cancelled) return;
      const spelling: EditorSuggestion[] = issues.flatMap((issue, i) =>
        issue.suggestions.slice(0, 2).map((s, j) => ({
          id: `sp-${i}-${j}`,
          kind: "spelling" as const,
          text: s,
          replacement: s,
        })),
      );
      setSuggestions([...spelling, ...PHRASE_BANK]);
    })();
    return () => {
      cancelled = true;
    };
  }, [language, text]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Suggestions
      </p>
      <ul className="space-y-1">
        {suggestions.slice(0, 8).map((item) => (
          <li key={item.id}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-auto w-full justify-start whitespace-normal px-2 py-1.5 text-left text-[11px]"
              onClick={() => onApply(item)}
            >
              <span className="mr-2 text-[10px] text-muted-foreground uppercase">
                {item.kind}
              </span>
              {item.text}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
