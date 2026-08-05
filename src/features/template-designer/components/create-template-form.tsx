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
import { createTemplateAction } from "@/features/template-designer/actions/template-designer.actions";
import {
  ASPECT_PRESETS,
  TEMPLATE_CATEGORIES,
} from "@/features/template-designer/constants/template-designer.constants";
import type {
  TemplateAspectPreset,
  TemplateCategory,
} from "@/features/template-designer/types/template-designer.types";

export function CreateTemplateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("custom");
  const [aspect, setAspect] = useState<TemplateAspectPreset>("1920x1080");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      const result = await createTemplateAction({
        name,
        code: code || undefined,
        description,
        category,
        aspectPreset: aspect,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Template created");
      router.push(`/templates/${result.data.id}/design`);
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Layout and behaviour only — Story data is bound later. Existing Scene
          Composer / Shape / Behaviour engines are reused.
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
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. ELECTION-001"
          className="font-mono"
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
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v: string) => setCategory(v as TemplateCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Canvas</Label>
          <Select
            value={aspect}
            onValueChange={(v: string) => setAspect(v as TemplateAspectPreset)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(ASPECT_PRESETS) as Array<
                  [TemplateAspectPreset, { label: string }]
                >
              ).map(([id, preset]) => (
                <SelectItem key={id} value={id}>
                  {preset.label} ({id})
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
