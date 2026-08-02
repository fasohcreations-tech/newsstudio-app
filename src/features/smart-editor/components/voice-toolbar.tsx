"use client";

import { Mic, Pause, Play, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpeechLocale } from "@/features/smart-editor/services/interfaces/editor-services";
import type { VoiceState } from "@/features/smart-editor/types/editor.types";

type VoiceToolbarProps = {
  state: VoiceState;
  liveTranscript: string;
  locale: SpeechLocale;
  error: string | null;
  onLocaleChange: (locale: SpeechLocale) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
};

export function VoiceToolbar({
  state,
  liveTranscript,
  locale,
  error,
  onLocaleChange,
  onStart,
  onPause,
  onResume,
  onStop,
  onCancel,
}: VoiceToolbarProps) {
  const recording = state === "recording";
  const paused = state === "paused";

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Voice dictation
        </p>
        <Select
          value={locale}
          onValueChange={(v) => onLocaleChange((v as SpeechLocale) ?? "mixed")}
        >
          <SelectTrigger className="h-7 w-[8rem] text-xs" aria-label="Speech locale">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ml-IN">Malayalam</SelectItem>
            <SelectItem value="en-IN">English (IN)</SelectItem>
            <SelectItem value="en-US">English (US)</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={recording || paused || state === "processing"}
          onClick={onStart}
        >
          <Mic className="size-3.5" />
          Start
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!recording}
          onClick={onPause}
        >
          <Pause className="size-3.5" />
          Pause
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!paused}
          onClick={onResume}
        >
          <Play className="size-3.5" />
          Resume
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8"
          disabled={!recording && !paused}
          onClick={onStop}
        >
          <Square className="size-3.5" />
          Stop
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          disabled={state === "idle"}
          onClick={onCancel}
        >
          <X className="size-3.5" />
          Cancel
        </Button>
      </div>

      <div
        className="min-h-16 rounded-md border border-dashed border-border/70 bg-background/70 p-2 text-xs leading-relaxed"
        aria-live="polite"
        aria-label="Live transcription"
      >
        {liveTranscript || (
          <span className="text-muted-foreground">
            Live transcription appears here. Providers are pluggable (mock
            active).
          </span>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Status: {state}
        </p>
      )}
    </div>
  );
}
