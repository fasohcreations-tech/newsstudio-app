"use client";

import { useState, useTransition } from "react";
import { Loader2, Activity, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  estimateCostAction,
  generateTextAction,
  healthCheckAction,
  type GenerateTextActionData,
} from "@/features/ai/actions/ai-generate.actions";
import type { CostEstimate, ProviderHealth } from "@/features/ai/types/ai";

type GeminiTestPanelProps = {
  defaultModel: string;
  defaultTemperature: number;
  geminiEnabled: boolean;
  keyConfigured: boolean;
};

export function GeminiTestPanel({
  defaultModel,
  defaultTemperature,
  geminiEnabled,
  keyConfigured,
}: GeminiTestPanelProps) {
  const [prompt, setPrompt] = useState(
    "Summarize why MediaOS needs a provider-agnostic AI orchestrator in two sentences.",
  );
  const [model, setModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(defaultTemperature);
  const [result, setResult] = useState<GenerateTextActionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [cost, setCost] = useState<CostEstimate | null>(null);
  const [pending, startTransition] = useTransition();

  function onGenerate() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const response = await generateTextAction({
        prompt,
        model,
        temperature,
        providerId: "gemini",
      });
      if (!response.success) {
        setError(response.error.message);
        toast.error(response.error.message);
        return;
      }
      setResult(response.data);
      toast.success("Gemini response received");
    });
  }

  function onHealth() {
    setError(null);
    startTransition(async () => {
      const response = await healthCheckAction("gemini");
      if (!response.success) {
        setError(response.error.message);
        toast.error(response.error.message);
        return;
      }
      setHealth(response.data);
      toast.success(`Health: ${response.data.status}`);
    });
  }

  function onEstimate() {
    setError(null);
    startTransition(async () => {
      const response = await estimateCostAction({
        providerId: "gemini",
        model,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: 256,
      });
      if (!response.success) {
        setError(response.error.message);
        toast.error(response.error.message);
        return;
      }
      setCost(response.data);
      toast.success("Cost estimate ready (placeholder)");
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            Gemini Test
          </CardTitle>
          <CardDescription>
            Calls run through the AI Orchestrator only. The browser never sees
            your API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={keyConfigured ? "default" : "destructive"}>
              {keyConfigured ? "GOOGLE_API_KEY present" : "API key missing"}
            </Badge>
            <Badge variant={geminiEnabled ? "secondary" : "outline"}>
              {geminiEnabled ? "Gemini enabled" : "Gemini disabled in settings"}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={pending}
                placeholder="gemini-3.5-flash"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || !prompt.trim()}
              onClick={onGenerate}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate Text
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onHealth}
            >
              <Activity className="size-4" />
              Health Check
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onEstimate}
            >
              Estimate Cost
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>
              {result.model} · {result.executionTimeMs}ms
              {result.tokensUsed != null
                ? ` · ${result.tokensUsed} tokens`
                : ""}
              {result.jobId ? ` · job ${result.jobId.slice(0, 8)}…` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
              {result.text}
            </pre>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Execution time</dt>
                <dd>{result.executionTimeMs} ms</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Token usage</dt>
                <dd>
                  {result.tokensUsed != null
                    ? result.tokensUsed.toLocaleString()
                    : "Not reported"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Finish reason</dt>
                <dd>{result.finishReason ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Est. cost (placeholder)</dt>
                <dd>
                  {result.estimatedCostUsd != null
                    ? `$${result.estimatedCostUsd.toFixed(6)}`
                    : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {health ? (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Status: <Badge>{health.status}</Badge>
            </p>
            <p className="text-muted-foreground">{health.message}</p>
            {health.latencyMs != null ? (
              <p>Latency: {health.latencyMs} ms</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {cost ? (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Cost estimate</CardTitle>
            <CardDescription>Placeholder rates — not live billing</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              {cost.currency} {cost.estimatedCost.toFixed(6)}
            </p>
            {cost.breakdown ? (
              <p className="text-muted-foreground">{cost.breakdown}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
