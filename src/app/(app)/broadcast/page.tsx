import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

export const metadata: Metadata = { title: "BroadcastOS" };

export default function BroadcastPage() {
  return (
    <div>
      <PageHeader
        title="BroadcastOS"
        description="Broadcast automation and playout control foundation."
      />
      <ModulePlaceholder
        title="BroadcastOS module"
        description="Navigation entry is live. Automation tooling ships in a later release."
      />
    </div>
  );
}
