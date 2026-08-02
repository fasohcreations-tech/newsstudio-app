import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getStoryById } from "@/features/newsroom/services/story.service";
import { EditStoryClient } from "@/features/newsroom/components/edit-story-client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EditStoryPageProps = {
  params: Promise<{ storyId: string }>;
};

export const metadata: Metadata = {
  title: "Edit story",
};

export default async function EditStoryPage({ params }: EditStoryPageProps) {
  await requireAuth();
  const { storyId } = await params;
  const supabase = await createClient();
  const { story, error } = await getStoryById(supabase, storyId);

  if (error || !story || story.deleted_at) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/newsroom/stories/${story.id}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        ← Back to story
      </Link>
      <EditStoryClient story={story} />
    </div>
  );
}
