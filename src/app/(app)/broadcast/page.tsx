import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";
import { BroadcastIntelligencePanel } from "@/features/ai/intelligence/components/broadcast-intelligence-panel";

export const metadata: Metadata = { title: "BroadcastOS" };

export default function BroadcastPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="BroadcastOS"
        description="Broadcast automation and playout control foundation."
      />
      <BroadcastIntelligencePanel />
      <ModulePlaceholder
        title="BroadcastOS module"
        description="Navigation entry is live. Automation tooling ships in a later release. Use Broadcast Intelligence above for bitrate, audio, safe-title, and stream-quality recommendations."
      />
    </div>
  );
}
