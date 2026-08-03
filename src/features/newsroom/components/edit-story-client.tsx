"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/shared/components/layout/page-header";
import { StoryForm } from "@/features/newsroom/components/story-form";
import { updateStoryAction } from "@/features/newsroom/actions/story.actions";
import type { StoryFormInput } from "@/features/newsroom/schemas/story.schemas";
import type { Story } from "@/features/newsroom/types/story.types";
import { Card, CardContent } from "@/components/ui/card";

type EditStoryClientProps = {
  story: Story;
};

export function EditStoryClient({ story }: EditStoryClientProps) {
  const router = useRouter();

  async function handleSubmit(values: StoryFormInput) {
    const result = await updateStoryAction(story.id, {
      title: values.title,
      subtitle: values.subtitle,
      summary: values.summary,
      sub_headline_media: values.sub_headline_media,
      status: values.status,
      priority: values.priority,
      category: values.category,
      language: values.language,
    });
    if (!result.success) {
      throw new Error(result.error);
    }
    toast.success("Story updated");
    router.push(`/newsroom/stories/${story.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Edit story"
        description="Update the core story record. Version history arrives in a later feature."
      />
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <StoryForm
            organizationId={story.organization_id}
            initialStory={story}
            submitLabel="Save changes"
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
