"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SourceTypeNav } from "@/features/intake/components/source-type-nav";
import { ImportQueue } from "@/features/intake/components/import-queue";
import { IntakePreviewPanel } from "@/features/intake/components/intake-preview-panel";
import type { IntakeSourceCode } from "@/features/intake/constants/intake.constants";
import type {
  SourceItemWithType,
  SourceType,
} from "@/features/intake/types/intake.types";

type IntakeCenterProps = {
  organizationName: string;
  sourceTypes: SourceType[];
  initialItems: SourceItemWithType[];
};

export function IntakeCenter({
  sourceTypes,
  initialItems,
}: IntakeCenterProps) {
  const router = useRouter();
  const [activeCode, setActiveCode] = useState<IntakeSourceCode | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItems[0]?.id ?? null,
  );

  const filteredItems = useMemo(() => {
    if (activeCode === "all") return initialItems;
    return initialItems.filter((item) => item.source_type.code === activeCode);
  }, [initialItems, activeCode]);

  const selected =
    filteredItems.find((item) => item.id === selectedId) ??
    filteredItems[0] ??
    null;

  return (
    <div className="grid min-h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-border/60 bg-background lg:grid-cols-[220px_minmax(0,1fr)_300px]">
      <aside className="border-b border-border/60 lg:border-r lg:border-b-0">
        <SourceTypeNav
          sourceTypes={sourceTypes}
          activeCode={activeCode}
          onSelect={(code) => {
            setActiveCode(code);
            setSelectedId(null);
          }}
        />
      </aside>

      <section className="min-h-[28rem] border-b border-border/60 lg:min-h-0 lg:border-r lg:border-b-0">
        <ImportQueue
          items={filteredItems}
          sourceTypes={sourceTypes}
          selectedId={selected?.id ?? null}
          activeSourceCode={activeCode}
          onSelect={setSelectedId}
          onEnqueued={() => router.refresh()}
        />
      </section>

      <aside className="min-h-[24rem] lg:min-h-0">
        <IntakePreviewPanel
          item={selected}
          onStoryCreated={() => router.refresh()}
        />
      </aside>
    </div>
  );
}
