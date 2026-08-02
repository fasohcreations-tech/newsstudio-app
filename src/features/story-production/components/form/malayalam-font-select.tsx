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
    STORY_MALAYALAM_FONT_OPTIONS.find((option) => option.family === value);

  return (
    <Select
      value={selected?.value ?? DEFAULT_MALAYALAM_FONT_VALUE}
      onValueChange={(next) => onChange(next ?? DEFAULT_MALAYALAM_FONT_VALUE)}
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
