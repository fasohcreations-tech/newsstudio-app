import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/shared/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { SmartEditorPlayground } from "@/features/smart-editor/components/smart-editor-playground";

export const metadata: Metadata = {
  title: "Smart Malayalam Editor · AI Center",
};

export default async function SmartEditorPage() {
  await requireAuth("/ai-center/smart-editor");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Universal Smart Malayalam Editor"
        description="Enterprise editor for Unicode Malayalam, Manglish, voice dictation, handwriting, and AI newsroom tools — provider-agnostic."
        actions={
          <Link
            href="/ai-center"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to AI Center
          </Link>
        }
      />
      <SmartEditorPlayground />
    </div>
  );
}
