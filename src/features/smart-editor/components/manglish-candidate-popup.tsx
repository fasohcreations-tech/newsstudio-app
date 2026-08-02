"use client";

import { cn } from "@/lib/utils";
import type { ManglishPopupState } from "@/features/smart-editor/hooks/use-manglish";
import type { ManglishCandidate } from "@/features/smart-editor/services/interfaces/editor-services";

type ManglishCandidatePopupProps = {
  popup: ManglishPopupState;
  onSelect: (candidate: ManglishCandidate) => void;
  onHover: (index: number) => void;
};

/**
 * Inline IME-style word picker for Manglish → Malayalam.
 */
export function ManglishCandidatePopup({
  popup,
  onSelect,
  onHover,
}: ManglishCandidatePopupProps) {
  if (!popup.open || popup.candidates.length === 0) return null;

  return (
    <div
      className="border-t border-border/60 bg-muted/40 px-2 py-1.5"
      role="listbox"
      aria-label="Manglish word suggestions"
    >
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Manglish · “{popup.query}”
        </p>
        <p className="text-[10px] text-muted-foreground">
          Same format as manglish.app · ↑↓ · 1–{Math.min(9, popup.candidates.length)} · Tab
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {popup.candidates.map((candidate, index) => (
          <button
            key={`${candidate.text}-${index}`}
            type="button"
            role="option"
            aria-selected={index === popup.activeIndex}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm transition-colors",
              index === popup.activeIndex
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background hover:bg-muted",
            )}
            onMouseEnter={() => onHover(index)}
            onClick={() => onSelect(candidate)}
          >
            <span className="text-[10px] opacity-70">{index + 1}</span>
            <span className="font-medium">{candidate.text}</span>
            {candidate.source === "google" ? (
              <span className="text-[9px] opacity-60">ml</span>
            ) : candidate.source === "lexicon" ? (
              <span className="text-[9px] opacity-60">dict</span>
            ) : candidate.source === "phonetic" ? (
              <span className="text-[9px] opacity-60">auto</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
