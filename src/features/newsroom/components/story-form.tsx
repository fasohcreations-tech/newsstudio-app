"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STORY_LANGUAGE_OPTIONS,
  STORY_PRIORITIES,
  STORY_PRIORITY_LABELS,
  STORY_STATUSES,
  STORY_STATUS_LABELS,
} from "@/features/newsroom/constants/story.constants";
import {
  storyFormDefaults,
  storyFormSchema,
  type StoryFormInput,
} from "@/features/newsroom/schemas/story.schemas";
import type { Story } from "@/features/newsroom/types/story.types";

type StoryFormProps = {
  organizationId: string;
  initialStory?: Story;
  submitLabel?: string;
  onSubmit: (values: StoryFormInput) => Promise<void>;
};

export function StoryForm({
  organizationId,
  initialStory,
  submitLabel = "Save story",
  onSubmit,
}: StoryFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<StoryFormInput>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: initialStory
      ? {
          title: initialStory.title,
          subtitle: initialStory.subtitle ?? "",
          summary: initialStory.summary ?? "",
          status: initialStory.status,
          priority: initialStory.priority,
          category: initialStory.category ?? "",
          language: initialStory.language,
          organization_id: initialStory.organization_id,
        }
      : {
          ...storyFormDefaults,
          organization_id: organizationId,
        },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  async function submit(values: StoryFormInput) {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save story.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          aria-invalid={Boolean(errors.title)}
          {...register("title")}
        />
        {errors.title ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" {...register("subtitle")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" rows={5} {...register("summary")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={watch("status")}
            onValueChange={(value) =>
              setValue("status", value as StoryFormInput["status"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STORY_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STORY_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.status.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={watch("priority")}
            onValueChange={(value) =>
              setValue("priority", value as StoryFormInput["priority"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {STORY_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {STORY_PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="Politics, Sports, Business…"
            {...register("category")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={watch("language") || "ml"}
            onValueChange={(value) => {
              if (!value) return;
              setValue("language", value, { shouldDirty: true, shouldValidate: true });
            }}
          >
            <SelectTrigger id="language" className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {STORY_LANGUAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" {...register("language")} />
          {errors.language ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.language.message}
            </p>
          ) : null}
        </div>
      </div>

      <input type="hidden" {...register("organization_id")} />

      {formError ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
