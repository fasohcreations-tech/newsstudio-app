"use client";

import {
  INTAKE_EXTRACTION_STATUS_LABELS,
  type IntakeSourceCode,
} from "@/features/intake/constants/intake.constants";
import type { SourceType } from "@/features/intake/types/intake.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SourceTypeNavProps = {
  sourceTypes: SourceType[];
  activeCode: IntakeSourceCode | "all";
  onSelect: (code: IntakeSourceCode | "all") => void;
};

export function SourceTypeNav({
  sourceTypes,
  activeCode,
  onSelect,
}: SourceTypeNavProps) {
  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Source types
      </p>
      <Button
        type="button"
        variant={activeCode === "all" ? "secondary" : "ghost"}
        className="justify-start"
        onClick={() => onSelect("all")}
      >
        All sources
      </Button>
      <div className="my-2 h-px bg-border" />
      {sourceTypes.map((type) => {
        const code = type.code as IntakeSourceCode;
        const active = activeCode === code;
        return (
          <Button
            key={type.id}
            type="button"
            variant={active ? "secondary" : "ghost"}
            className={cn("h-auto justify-start py-2 text-left")}
            onClick={() => onSelect(code)}
          >
            <span className="flex flex-col items-start gap-0.5">
              <span>{type.name}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {type.category}
              </span>
            </span>
          </Button>
        );
      })}
      <p className="mt-auto px-2 pt-4 text-[11px] leading-relaxed text-muted-foreground">
        Extraction adapters are reserved. Status labels:{" "}
        {Object.values(INTAKE_EXTRACTION_STATUS_LABELS).slice(0, 3).join(", ")}
        …
      </p>
    </nav>
  );
}
