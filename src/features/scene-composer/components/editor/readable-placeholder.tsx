"use client";

import {
  Clock,
  Film,
  FolderOpen,
  Image,
  Type,
  PanelBottom,
  User,
} from "lucide-react";

type ReadablePlaceholderProps = {
  kind:
    | "video"
    | "headline"
    | "subheadline"
    | "reporter"
    | "logo"
    | "ticker"
    | "clock"
    | "date"
    | "image"
    | "optional"
    | "generic";
  label?: string;
  /** When set, shows Browse Media CTA for media slots. */
  onBrowse?: () => void;
};

const KIND_META: Record<
  ReadablePlaceholderProps["kind"],
  { label: string; Icon: typeof Film; browseable: boolean }
> = {
  video: { label: "Drop Video", Icon: Film, browseable: true },
  headline: { label: "Headline", Icon: Type, browseable: false },
  subheadline: { label: "Subheadline", Icon: Type, browseable: false },
  reporter: { label: "Reporter", Icon: User, browseable: true },
  logo: { label: "Logo", Icon: Image, browseable: true },
  ticker: { label: "Ticker", Icon: PanelBottom, browseable: false },
  clock: { label: "Clock", Icon: Clock, browseable: false },
  date: { label: "Date", Icon: Clock, browseable: false },
  image: { label: "Image", Icon: Image, browseable: true },
  optional: { label: "Image or Text", Icon: Image, browseable: true },
  generic: { label: "Content", Icon: Type, browseable: false },
};

/**
 * Large readable placeholder — disappears when real content is assigned.
 */
export function ReadablePlaceholder({
  kind,
  label,
  onBrowse,
}: ReadablePlaceholderProps) {
  const meta = KIND_META[kind];
  const Icon = meta.Icon;
  const canBrowse = Boolean(onBrowse) && meta.browseable;

  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 bg-black/25 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl border border-white/20 bg-white/5">
        <Icon className="size-7 text-white/70" strokeWidth={1.5} />
      </div>
      <p className="text-[18px] font-semibold tracking-wide text-white/85">
        {label ?? meta.label}
      </p>
      {canBrowse ? (
        <button
          type="button"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-[14px] font-medium text-white/90 hover:bg-white/20"
          onClick={(event) => {
            event.stopPropagation();
            onBrowse?.();
          }}
        >
          <FolderOpen className="size-4" />
          Browse Media
        </button>
      ) : null}
    </div>
  );
}

export function placeholderKindForObject(input: {
  name: string;
  object_type: string;
  regionKey?: string;
}): ReadablePlaceholderProps["kind"] {
  const key = (input.regionKey ?? input.name).toLowerCase();
  if (key.includes("optional")) return "optional";
  if (key.includes("video") || input.object_type === "video") return "video";
  if (key.includes("headline") && !key.includes("sub")) return "headline";
  if (key.includes("subheadline") || key.includes("subtitle")) return "subheadline";
  if (key.includes("reporter")) return "reporter";
  if (key.includes("logo")) return "logo";
  if (key.includes("ticker") || input.object_type === "ticker") return "ticker";
  if (key.includes("clock") || input.object_type === "clock") return "clock";
  if (key.includes("date") || input.object_type === "date") return "date";
  if (input.object_type === "image") return "image";
  return "generic";
}
