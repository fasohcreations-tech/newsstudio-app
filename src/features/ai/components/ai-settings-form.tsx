"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { saveAISettingsAction } from "@/features/ai/actions/ai-settings.actions";
import { AI_PROVIDER_IDS, type AIOrgSettings } from "@/features/ai/types/ai";
import type { ProviderKeyPresence } from "@/features/ai/types/ai";

const PROVIDER_LABELS: Record<(typeof AI_PROVIDER_IDS)[number], string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
  ollama: "Ollama",
};

type AISettingsFormProps = {
  initialSettings: AIOrgSettings;
  keyPresence: ProviderKeyPresence;
};

export function AISettingsForm({
  initialSettings,
  keyPresence,
}: AISettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<AIOrgSettings>(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
    [settings, initialSettings],
  );

  function updateField<K extends keyof AIOrgSettings>(
    key: K,
    value: AIOrgSettings[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveAISettingsAction(settings);
      if (!result.success) {
        setError(result.error);
        toast.error("Could not save AI settings");
        return;
      }
      toast.success("AI settings saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>
            Provider preference and generation parameters for this organization.
            API keys stay in server environment variables only.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="defaultProvider">Default provider</Label>
            <Select
              value={settings.defaultProvider}
              onValueChange={(value) => {
                if (!value) return;
                updateField(
                  "defaultProvider",
                  value as AIOrgSettings["defaultProvider"],
                );
              }}
            >
              <SelectTrigger id="defaultProvider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDER_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {PROVIDER_LABELS[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredModel">Preferred model</Label>
            <Input
              id="preferredModel"
              value={settings.preferredModel}
              onChange={(e) => updateField("preferredModel", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={settings.temperature}
              onChange={(e) =>
                updateField("temperature", Number(e.target.value))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topP">Top P</Label>
            <Input
              id="topP"
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={settings.topP}
              onChange={(e) => updateField("topP", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topK">Top K</Label>
            <Input
              id="topK"
              type="number"
              min={1}
              max={100}
              value={settings.topK}
              onChange={(e) => updateField("topK", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max output tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              min={64}
              max={128000}
              value={settings.maxTokens}
              onChange={(e) => updateField("maxTokens", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeoutMs">Timeout (ms)</Label>
            <Input
              id="timeoutMs"
              type="number"
              min={1000}
              max={600000}
              value={settings.timeoutMs}
              onChange={(e) => updateField("timeoutMs", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="retryCount">Retry count</Label>
            <Input
              id="retryCount"
              type="number"
              min={0}
              max={5}
              value={settings.retryCount}
              onChange={(e) =>
                updateField("retryCount", Number(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Providers</CardTitle>
          <CardDescription>
            Enable or disable adapters. Credentials are never shown in the
            browser — only whether the matching env var is configured on the
            server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {AI_PROVIDER_IDS.map((id) => {
            const toggle = settings.providers[id];
            const presence = keyPresence[id];
            return (
              <div
                key={id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{PROVIDER_LABELS[id]}</p>
                    <Badge variant={presence.configured ? "default" : "secondary"}>
                      {presence.configured ? "Key present" : "Key missing"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {presence.envVar}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${id}-model`}
                      className="text-xs text-muted-foreground"
                    >
                      Model
                    </Label>
                    <Input
                      id={`${id}-model`}
                      className="h-8 max-w-xs"
                      value={toggle.preferredModel ?? ""}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          providers: {
                            ...prev.providers,
                            [id]: {
                              ...prev.providers[id],
                              preferredModel: e.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${id}-enabled`}>Enabled</Label>
                  <Switch
                    id={`${id}-enabled`}
                    checked={toggle.enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        providers: {
                          ...prev.providers,
                          [id]: {
                            ...prev.providers[id],
                            enabled: checked,
                          },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>AI Production stages</CardTitle>
          <CardDescription>
            Enable or disable pipeline stages and set a default provider per task
            type. Mock runners only — no automatic publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                "research",
                "editorial",
                "script",
                "translation",
                "voice",
                "timeline",
                "graphics",
                "publishing",
              ] as const
            ).map((stage) => {
              const enabled =
                settings.production?.stages?.[stage] ?? true;
              return (
                <div
                  key={stage}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <Label htmlFor={`stage-${stage}`} className="capitalize">
                    {stage.replace("_", " ")}
                  </Label>
                  <Switch
                    id={`stage-${stage}`}
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        production: {
                          stages: {
                            research: true,
                            editorial: true,
                            script: true,
                            translation: true,
                            voice: true,
                            timeline: true,
                            graphics: true,
                            publishing: true,
                            ...(prev.production?.stages ?? {}),
                            [stage]: checked,
                          },
                          taskProviders: {
                            ...(prev.production?.taskProviders ?? {}),
                          },
                        },
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Default provider per task</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  "research",
                  "headline_suggestion",
                  "summary",
                  "script_generation",
                  "translation",
                  "voice_over",
                  "timeline_draft",
                  "thumbnail_suggestion",
                  "poster_suggestion",
                  "seo_metadata",
                  "social_media_package",
                ] as const
              ).map((task) => {
                const value =
                  settings.production?.taskProviders?.[task] ??
                  settings.defaultProvider;
                return (
                  <div key={task} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {task.replaceAll("_", " ")}
                    </Label>
                    <Select
                      value={value}
                      onValueChange={(next) => {
                        if (!next) return;
                        setSettings((prev) => ({
                          ...prev,
                          production: {
                            stages: {
                              research: true,
                              editorial: true,
                              script: true,
                              translation: true,
                              voice: true,
                              timeline: true,
                              graphics: true,
                              publishing: true,
                              ...(prev.production?.stages ?? {}),
                            },
                            taskProviders: {
                              ...(prev.production?.taskProviders ?? {}),
                              [task]: next as (typeof AI_PROVIDER_IDS)[number],
                            },
                          },
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDER_IDS.map((id) => (
                          <SelectItem key={id} value={id}>
                            {PROVIDER_LABELS[id]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Changes apply to all modules that call the AI Orchestrator.
            </p>
          )}
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save AI settings"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
