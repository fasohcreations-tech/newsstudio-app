"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  deleteStoryAction,
  restoreStoryAction,
} from "@/features/newsroom/actions/story.actions";

type DeleteRestoreButtonsProps = {
  storyId: string;
  isDeleted: boolean;
};

export function DeleteRestoreButtons({
  storyId,
  isDeleted,
}: DeleteRestoreButtonsProps) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteStoryAction(storyId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Story moved to trash");
    router.push("/newsroom");
    router.refresh();
  }

  async function handleRestore() {
    const result = await restoreStoryAction(storyId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Story restored");
    router.refresh();
  }

  if (isDeleted) {
    return (
      <Button type="button" variant="outline" onClick={handleRestore}>
        Restore
      </Button>
    );
  }

  return (
    <Button type="button" variant="destructive" onClick={handleDelete}>
      Move to trash
    </Button>
  );
}
