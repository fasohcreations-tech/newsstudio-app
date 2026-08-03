"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_MALAYALAM_FONT_VALUE,
  STORY_MALAYALAM_FONT_OPTIONS,
} from "@/features/story-production/constants/story-font-options";

type MalayalamFontSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function MalayalamFontSelect({
  value,
  onChange,
  className,
}: MalayalamFontSelectProps) {
  const selected =
    STORY_MALAYALAM_FONT_OPTIONS.find((option) => option.value === value) ??
    // Prefer bold when resolving a bare CSS family string.
    [...STORY_MALAYALAM_FONT_OPTIONS]
      .reverse()
      .find((option) => option.family === value);

  const token = selected?.value ?? DEFAULT_MALAYALAM_FONT_VALUE;

  return (
    <Select
      value={token}
      onValueChange={(next) => {
        const resolved = next ?? DEFAULT_MALAYALAM_FONT_VALUE;
        // Ignore sync re-emits and family↔token equivalents.
        if (resolved === value || resolved === token) return;
        onChange(resolved);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select Malayalam font" />
      </SelectTrigger>
      <SelectContent>
        {STORY_MALAYALAM_FONT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
