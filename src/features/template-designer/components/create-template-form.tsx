"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createMotionSceneAction,
  updateMotionSceneAction,
} from "@/features/motion-scene-engine/actions/motion-scene.actions";
import { MOTION_SCENE_TYPES } from "@/features/motion-scene-engine/constants/motion-scene.constants";
import type {
  MotionSceneType,
  SceneAspectFormat,
} from "@/features/motion-scene-engine/types/motion-scene.types";

const ASPECTS: Array<{ id: SceneAspectFormat; label: string }> = [
  { id: "16:9", label: "16:9 — Broadcast HD" },
  { id: "9:16", label: "9:16 — Vertical / Reels" },
  { id: "1:1", label: "1:1 — Square" },
  { id: "4:5", label: "4:5 — Portrait" },
  { id: "21:9", label: "21:9 — Cinematic" },
];

function typeLabel(id: string) {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CreateTemplateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sceneType, setSceneType] = useState<MotionSceneType>("lower_third");
  const [aspect, setAspect] = useState<SceneAspectFormat>("16:9");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      const created = await createMotionSceneAction({
        name: name.trim(),
        sceneType,
      });
      if (!created.success) {
        toast.error(created.error);
        return;
      }

      // Description / aspect are not part of the create contract — patch them
      // straight after so the new template opens with the chosen canvas.
      if (description.trim() || aspect !== "16:9") {
        await updateMotionSceneAction({
          sceneId: created.data.id,
          patch: {
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(aspect !== "16:9" ? { aspect_format: aspect } : {}),
          },
        });
      }

      toast.success("Template created");
      router.push(`/templates/${created.data.id}/design`);
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Layout and behaviour only — story data is bound later. The template
          opens in the single Design workspace.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Election Night Lower Third"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Template kind</Label>
          <Select
            value={sceneType}
            onValueChange={(v: string) => setSceneType(v as MotionSceneType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOTION_SCENE_TYPES.map((id) => (
                <SelectItem key={id} value={id}>
                  {typeLabel(id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Canvas</Label>
          <Select
            value={aspect}
            onValueChange={(v: string) => setAspect(v as SceneAspectFormat)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECTS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create & open Designer"}
        </Button>
        <Link
          href="/templates"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
