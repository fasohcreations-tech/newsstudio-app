import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Publishing" };

export default function PublishingPage() {
  return (
    <div>
      <PageHeader
        title="Publishing"
        description="Distribution foundation for YouTube, OTT, and channel publishing."
      />
      <ModulePlaceholder
        title="Publishing module"
        description="Route reserved. Publishing workflows are intentionally out of scope for Feature 001."
      />
    </div>
  );
}
