"use client";

import { Sparkles } from "lucide-react";

import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

export function AiAssistantPanel() {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5" />
        AI Assistant
      </p>
      <ModulePlaceholder
        title="AI editing extension point"
        description="Future AI-assisted cuts, captions, graphics, and package suggestions will dock here. Manual editing remains the primary workflow in Module 3.0."
      />
    </div>
  );
}
