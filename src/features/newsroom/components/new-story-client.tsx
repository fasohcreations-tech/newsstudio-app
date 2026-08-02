"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/shared/components/layout/page-header";
import { StoryForm } from "@/features/newsroom/components/story-form";
import { createStoryAction } from "@/features/newsroom/actions/story.actions";
import type { StoryFormInput } from "@/features/newsroom/schemas/story.schemas";
import { Card, CardContent } from "@/components/ui/card";

type NewStoryClientProps = {
  organizationId: string;
};

export function NewStoryClient({ organizationId }: NewStoryClientProps) {
  const router = useRouter();

  async function handleSubmit(values: StoryFormInput) {
    const result = await createStoryAction(values);
    if (!result.success) {
      throw new Error(result.error);
    }
    toast.success("Story created");
    router.push(`/newsroom/stories/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New story"
        description="Create a story record. Downstream modules (media, AI, publishing) will attach here."
      />
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <StoryForm
            organizationId={organizationId}
            submitLabel="Create story"
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
