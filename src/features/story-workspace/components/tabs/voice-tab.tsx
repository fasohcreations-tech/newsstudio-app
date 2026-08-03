"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Check,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_GEMINI_TTS_VOICE,
  DEFAULT_PITCH,
  DEFAULT_SPEAKING_RATE,
  DEFAULT_TTS_LANGUAGE,
  DEFAULT_TTS_PROVIDER,
  DEFAULT_VOLUME_GAIN_DB,
  STORY_VOICE_STATUS_LABELS,
  TTS_LANGUAGES,
  TTS_PROVIDER_LABELS,
  findVoiceOption,
  voicesForProvider,
  type TtsLanguageCode,
  type TtsProvider,
  type TtsVoiceOption,
} from "@/features/story-voice/constants/voice.constants";
import {
  generateStoryVoiceAction,
  getStoryVoiceSignedUrlAction,
  previewVoiceSampleAction,
  regenerateStoryVoiceAction,
} from "@/features/story-voice/actions/voice.actions";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import type { StoryVoiceStatus } from "@/shared/types/database.types";
import { cn } from "@/lib/utils";

type VoiceTabProps = {
  story: StoryWithRelations;
  disabled?: boolean;
  onStoryUpdated?: (story: StoryWithRelations) => void;
  onOpenScript?: () => void;
};

type GenderFilter = "all" | "FEMALE" | "MALE";
type PanelTab = "generate" | "samples";

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildGeminiStylePrompt(input: {
  base: string;
  speakingRate: number;
  pitch: number;
  volumeGainDb: number;
}): string {
  const notes: string[] = [];
  if (input.speakingRate < 0.9) notes.push("Speak slightly slower than normal.");
  else if (input.speakingRate > 1.15) notes.push("Speak slightly faster than normal.");
  if (input.pitch < -2) notes.push("Use a slightly lower pitch.");
  else if (input.pitch > 2) notes.push("Use a slightly higher pitch.");
  if (input.volumeGainDb < -2) notes.push("Keep volume restrained.");
  else if (input.volumeGainDb > 2) notes.push("Project with strong presence.");

  return [input.base.trim(), ...notes].filter(Boolean).join(" ");
}

export function VoiceTab({
  story,
  disabled,
  onStoryUpdated,
  onOpenScript,
}: VoiceTabProps) {
  const [localStory, setLocalStory] = useState(story);
  const [panelTab, setPanelTab] = useState<PanelTab>("generate");
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [samplingVoice, setSamplingVoice] = useState<string | null>(null);
  const [playingSampleName, setPlayingSampleName] = useState<string | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    localStory.voice_url,
  );
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const sampleRequestId = useRef(0);
  const progressTimer = useRef<number | null>(null);

  const [provider, setProvider] = useState<TtsProvider>(() => {
    const existing = findVoiceOption(localStory.voice_name ?? "");
    return existing?.provider ?? DEFAULT_TTS_PROVIDER;
  });
  const [languageCode, setLanguageCode] = useState<TtsLanguageCode>(
    (localStory.voice_language as TtsLanguageCode | null) ??
      DEFAULT_TTS_LANGUAGE,
  );
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [voiceName, setVoiceName] = useState(
    localStory.voice_name ?? DEFAULT_GEMINI_TTS_VOICE,
  );
  const [speakingRate, setSpeakingRate] = useState(
    Number(localStory.voice_speaking_rate ?? DEFAULT_SPEAKING_RATE),
  );
  const [pitch, setPitch] = useState(
    Number(localStory.voice_pitch ?? DEFAULT_PITCH),
  );
  const [volumeGainDb, setVolumeGainDb] = useState(
    Number(localStory.voice_volume_gain_db ?? DEFAULT_VOLUME_GAIN_DB),
  );
  const [stylePrompt, setStylePrompt] = useState(
    "Read this as a clear, professional news anchor. Natural pacing, confident delivery.",
  );

  useEffect(() => {
    setLocalStory(story);
    setPreviewUrl(story.voice_url);
  }, [story]);

  useEffect(() => {
    return () => {
      if (progressTimer.current) window.clearInterval(progressTimer.current);
    };
  }, []);

  const catalogVoices = useMemo(() => {
    return voicesForProvider(provider).filter((voice) => {
      if (genderFilter !== "all" && voice.gender !== genderFilter) return false;
      if (provider === "google-cloud" && voice.languageCode !== languageCode) {
        return false;
      }
      return true;
    });
  }, [provider, languageCode, genderFilter]);

  useEffect(() => {
    if (!catalogVoices.some((voice) => voice.name === voiceName)) {
      setVoiceName(
        catalogVoices[0]?.name ??
          (provider === "gemini"
            ? DEFAULT_GEMINI_TTS_VOICE
            : "ml-IN-Wavenet-A"),
      );
    }
  }, [catalogVoices, voiceName, provider]);

  const selectedVoice = useMemo(
    () => findVoiceOption(voiceName) ?? null,
    [voiceName],
  );

  const approved = Boolean(localStory.approved_script);
  const approvedScript = localStory.approved_script?.trim() ?? "";
  const voiceStatus = (localStory.voice_status ?? "none") as StoryVoiceStatus;
  const hasAudio =
    voiceStatus === "ready" ||
    voiceStatus === "stale" ||
    Boolean(localStory.voice_url);
  const busy = pending || generating;

  const stopSample = () => {
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }
  };

  const startGenerateProgress = () => {
    setGenerateProgress(8);
    if (progressTimer.current) window.clearInterval(progressTimer.current);
    progressTimer.current = window.setInterval(() => {
      setGenerateProgress((value) => {
        if (value >= 90) return value;
        return value + Math.max(1, Math.round((90 - value) * 0.08));
      });
    }, 400);
  };

  const stopGenerateProgress = (complete: boolean) => {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setGenerateProgress(complete ? 100 : 0);
  };

  const hearSample = (voice: TtsVoiceOption) => {
    const requestId = ++sampleRequestId.current;
    setSamplingVoice(voice.name);
    setPlayingSampleName(null);
    startTransition(async () => {
      stopSample();
      const result = await previewVoiceSampleAction({
        provider,
        languageCode:
          provider === "google-cloud"
            ? voice.languageCode === "auto"
              ? languageCode
              : voice.languageCode
            : undefined,
        voiceName: voice.name,
      });
      if (requestId !== sampleRequestId.current) return;
      setSamplingVoice(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setVoiceName(result.data.voiceName);
      if (
        result.data.provider === "google-cloud" &&
        result.data.languageCode !== "auto"
      ) {
        setLanguageCode(result.data.languageCode as TtsLanguageCode);
      }
      setPlayingSampleName(result.data.voiceName);
      const audio = new Audio(result.data.audioDataUrl);
      sampleAudioRef.current = audio;
      audio.onended = () => {
        if (sampleRequestId.current === requestId) {
          setPlayingSampleName(null);
        }
      };
      void audio.play().catch(() => {
        toast.message(
          `Sample for ${voice.label} is ready — click play if autoplay was blocked.`,
        );
      });
      toast.message(`Playing sample: ${voice.label}`);
    });
  };

  const runGenerate = (regenerate: boolean) => {
    if (!approved) {
      toast.error("Approve the script first.");
      onOpenScript?.();
      return;
    }

    setPanelTab("generate");
    setGenerating(true);
    startGenerateProgress();
    const toastId = toast.loading(
      regenerate ? "Regenerating voice…" : "Generating voice…",
      {
        description: `${selectedVoice?.label ?? voiceName} · ${TTS_PROVIDER_LABELS[provider]}`,
      },
    );

    startTransition(async () => {
      stopSample();
      const action = regenerate
        ? regenerateStoryVoiceAction
        : generateStoryVoiceAction;
      const result = await action({
        storyId: localStory.id,
        provider,
        languageCode,
        voiceName,
        speakingRate,
        pitch,
        volumeGainDb,
        stylePrompt:
          provider === "gemini"
            ? buildGeminiStylePrompt({
                base: stylePrompt,
                speakingRate,
                pitch,
                volumeGainDb,
              })
            : undefined,
      });

      setGenerating(false);
      stopGenerateProgress(result.success);

      if (!result.success) {
        toast.error(result.error, { id: toastId });
        return;
      }

      const next = { ...localStory, ...result.data.story };
      setLocalStory(next);
      setPreviewUrl(result.data.audioUrl);
      onStoryUpdated?.(next);
      toast.success(
        regenerate ? "Voice regenerated and stored" : "Voice generated and stored",
        { id: toastId },
      );
      window.setTimeout(() => setGenerateProgress(0), 800);
    });
  };

  const refreshPreview = () => {
    startTransition(async () => {
      const result = await getStoryVoiceSignedUrlAction(localStory.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPreviewUrl(result.data.url);
      toast.message("Preview URL refreshed");
    });
  };

  const downloadVoice = () => {
    startTransition(async () => {
      const result = await getStoryVoiceSignedUrlAction(localStory.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = result.data.url;
      const ext = result.data.url.includes(".wav") ? "wav" : "mp3";
      anchor.download = `${localStory.slug || localStory.id}-voice.${ext}`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    });
  };

  return (
    <div className="relative mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Voice Generation</h2>
            <Badge variant="secondary" className="text-[10px]">
              {STORY_VOICE_STATUS_LABELS[voiceStatus]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {TTS_PROVIDER_LABELS[provider]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Review the script, set delivery, generate — pick samples in the
            Samples tab.
          </p>
        </div>
        {selectedVoice ? (
          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium">{selectedVoice.label}</p>
            <p className="text-muted-foreground">
              {selectedVoice.family} · {selectedVoice.gender.toLowerCase()}
            </p>
          </div>
        ) : null}
      </div>

      {generating ? (
        <div className="sticky top-0 z-20 space-y-2 rounded-md border border-primary/30 bg-background/95 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="size-4 animate-spin text-primary" />
            Generating voice…
          </div>
          <p className="text-xs text-muted-foreground">
            Synthesizing with {selectedVoice?.label ?? voiceName} via{" "}
            {TTS_PROVIDER_LABELS[provider]}. This can take several seconds.
          </p>
          <Progress value={generateProgress} className="w-full" />
        </div>
      ) : null}

      <Tabs
        value={panelTab}
        onValueChange={(value) => {
          if (value === "generate" || value === "samples") setPanelTab(value);
        }}
      >
        <TabsList className="grid w-full grid-cols-2 sm:w-[360px]">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="samples">Voice samples</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4 space-y-4">
          <section className="space-y-3 rounded-md border border-border/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Approved script
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {approved
                    ? `${approvedScript.length} characters`
                    : "Approve the script before generating"}
                  {localStory.approved_at
                    ? ` · ${new Date(localStory.approved_at).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onOpenScript}
                >
                  Edit script
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPanelTab("samples")}
                >
                  Change voice
                </Button>
              </div>
            </div>

            {!approved ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                No approved script yet.{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={onOpenScript}
                >
                  Open Script →
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-36 rounded-md border border-border/40 bg-muted/20">
                <pre className="whitespace-pre-wrap break-words p-3 font-sans text-sm leading-relaxed">
                  {approvedScript}
                </pre>
              </ScrollArea>
            )}

            <div className="grid gap-3 border-t border-border/40 pt-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tts-provider">Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(value: string | null) => {
                    if (!value) return;
                    setProvider(value as TtsProvider);
                  }}
                  disabled={disabled || busy}
                >
                  <SelectTrigger id="tts-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">
                      {TTS_PROVIDER_LABELS.gemini}
                    </SelectItem>
                    <SelectItem value="google-cloud">
                      {TTS_PROVIDER_LABELS["google-cloud"]}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {provider === "google-cloud" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="gen-language">Language</Label>
                  <Select
                    value={languageCode}
                    onValueChange={(value: string | null) => {
                      if (!value) return;
                      setLanguageCode(value as TtsLanguageCode);
                    }}
                    disabled={disabled || busy}
                  >
                    <SelectTrigger id="gen-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTS_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <p className="rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                    Auto-detected from script (Malayalam / English)
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Voice settings
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="speaking-rate">
                    Speaking rate ({speakingRate.toFixed(2)})
                  </Label>
                  <input
                    id="speaking-rate"
                    type="range"
                    min={0.25}
                    max={4}
                    step={0.05}
                    value={speakingRate}
                    disabled={disabled || busy}
                    onChange={(event) =>
                      setSpeakingRate(Number(event.target.value))
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pitch">Pitch ({pitch.toFixed(1)})</Label>
                  <input
                    id="pitch"
                    type="range"
                    min={-20}
                    max={20}
                    step={0.5}
                    value={pitch}
                    disabled={disabled || busy}
                    onChange={(event) => setPitch(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="volume">
                    Volume ({volumeGainDb.toFixed(1)} dB)
                  </Label>
                  <input
                    id="volume"
                    type="range"
                    min={-16}
                    max={16}
                    step={0.5}
                    value={volumeGainDb}
                    disabled={disabled || busy}
                    onChange={(event) =>
                      setVolumeGainDb(Number(event.target.value))
                    }
                    className="w-full"
                  />
                </div>
              </div>
              {provider === "gemini" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="style-prompt">Delivery style</Label>
                  <Textarea
                    id="style-prompt"
                    value={stylePrompt}
                    disabled={disabled || busy}
                    onChange={(event) => setStylePrompt(event.target.value)}
                    rows={2}
                    className="text-sm"
                    placeholder="News anchor style, pacing, tone…"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Rate / pitch / volume are translated into Gemini delivery
                    notes. Style text is sent with the script.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Rate, pitch, and volume are applied directly by Google Cloud
                  TTS.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
              <Button
                type="button"
                disabled={disabled || busy || !approved}
                onClick={() => runGenerate(false)}
              >
                {generating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Generate Voice
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || busy || !approved}
                onClick={() => runGenerate(true)}
              >
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || busy || !hasAudio}
                onClick={refreshPreview}
              >
                <Volume2 className="size-3.5" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || busy || !hasAudio}
                onClick={downloadVoice}
              >
                <Download className="size-3.5" />
                Download
              </Button>
            </div>

            {localStory.voice_error ? (
              <p className="text-sm text-destructive">{localStory.voice_error}</p>
            ) : null}
          </section>

          <section className="space-y-2 rounded-md border border-border/50 p-3">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Duration {formatDuration(localStory.voice_duration_ms)}</span>
              <span>Voice {localStory.voice_name ?? "—"}</span>
              <span>Language {localStory.voice_language ?? "—"}</span>
              <span>
                Generated{" "}
                {localStory.voice_generated_at
                  ? new Date(localStory.voice_generated_at).toLocaleString()
                  : "—"}
              </span>
            </div>
            {previewUrl ? (
              <audio
                key={previewUrl}
                controls
                className="w-full"
                src={previewUrl}
                preload="metadata"
              >
                Your browser does not support audio playback.
              </audio>
            ) : (
              <p className="text-sm text-muted-foreground">
                No generated audio yet. Generate from the script above.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="samples" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sample-provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(value: string | null) => {
                  if (!value) return;
                  setProvider(value as TtsProvider);
                }}
                disabled={disabled || busy}
              >
                <SelectTrigger id="sample-provider" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">
                    {TTS_PROVIDER_LABELS.gemini}
                  </SelectItem>
                  <SelectItem value="google-cloud">
                    {TTS_PROVIDER_LABELS["google-cloud"]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {provider === "google-cloud" ? (
              <div className="space-y-1.5">
                <Label htmlFor="sample-language">Language</Label>
                <Select
                  value={languageCode}
                  onValueChange={(value: string | null) => {
                    if (!value) return;
                    setLanguageCode(value as TtsLanguageCode);
                  }}
                  disabled={disabled || busy}
                >
                  <SelectTrigger id="sample-language" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="sample-gender">Gender</Label>
              <Select
                value={genderFilter}
                onValueChange={(value: string | null) => {
                  if (!value) return;
                  setGenderFilter(value as GenderFilter);
                }}
                disabled={disabled || busy}
              >
                <SelectTrigger id="sample-gender" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="mb-1 text-[10px]">
              {catalogVoices.length} models
            </Badge>
          </div>

          {playingSampleName ? (
            <p className="text-xs text-primary">
              Now playing:{" "}
              {findVoiceOption(playingSampleName)?.label ?? playingSampleName}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Hear a sample, then select a voice. Return to Generate to
              synthesize the script.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {catalogVoices.map((voice) => {
              const selected = voice.name === voiceName;
              const sampling = samplingVoice === voice.name;
              return (
                <div
                  key={voice.name}
                  className={cn(
                    "rounded-md border px-3 py-2 transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      disabled={disabled || busy}
                      onClick={() => {
                        setVoiceName(voice.name);
                        setProvider(voice.provider);
                        if (voice.languageCode !== "auto") {
                          setLanguageCode(voice.languageCode);
                        }
                        toast.success(`Selected ${voice.label}`);
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{voice.label}</p>
                        {selected ? (
                          <Badge className="text-[10px]">
                            <Check className="mr-0.5 size-3" />
                            Selected
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {voice.description}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {voice.gender.toLowerCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {voice.family}
                        </Badge>
                      </div>
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={disabled || busy}
                      onClick={() => hearSample(voice)}
                    >
                      {sampling ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      Hear
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setPanelTab("generate")}
              disabled={!selectedVoice}
            >
              Use {selectedVoice?.label ?? "selected voice"} →
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
