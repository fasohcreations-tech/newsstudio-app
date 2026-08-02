import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Performance, audience, and operational analytics foundation."
      />
      <ModulePlaceholder
        title="Analytics module"
        description="Shell access is ready. Reporting surfaces will land with data pipelines."
      />
    </div>
  );
}
