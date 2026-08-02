"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type StoryFormFieldProps = {
  label: string;
  bindingToken?: string;
  type?: "text" | "textarea" | "toggle" | "color";
  value: string | boolean;
  onChange: (value: string | boolean) => void;
};

export function StoryFormField({
  label,
  bindingToken,
  type = "text",
  value,
  onChange,
}: StoryFormFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {bindingToken ? (
          <code className="text-[9px] text-muted-foreground">{bindingToken}</code>
        ) : null}
      </div>

      {type === "toggle" ? (
        <div className="flex items-center gap-2">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <span className="text-xs text-muted-foreground">
            {Boolean(value) ? "On" : "Off"}
          </span>
        </div>
      ) : type === "textarea" ? (
        <Textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[72px] text-xs"
        />
      ) : type === "color" ? (
        <div className="flex gap-2">
          <Input
            type="color"
            value={String(value) || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-12 p-1"
          />
          <Input
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      ) : (
        <Input
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}
