"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCreativeProjectAction } from "@/features/creative-studio/actions/project.actions";
import type { CreativeProject } from "@/features/creative-studio/types/creative-studio.types";

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  storyId?: string;
  onCreated?: (project: CreativeProject) => void;
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  organizationId,
  storyId,
  onCreated,
}: CreateProjectDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!title.trim()) {
      toast.error("Project title is required");
      return;
    }

    startTransition(async () => {
      const result = await createCreativeProjectAction({
        title,
        description,
        storyId: storyId ?? null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Project created");
      onCreated?.(result.data);
      setTitle("");
      setDescription("");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Creative Studio Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-title">Title</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Evening bulletin package"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes for editors and producers"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? "Creating…" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
