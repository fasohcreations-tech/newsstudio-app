/**
 * Short lower-info / lower-third lines (Sub Headlines) + per-slot media refs.
 * Text slots join into `summary`; media refs are parallel for scene building.
 */

export const SUB_HEADLINE_SLOT_COUNT = 4;
export const SUB_HEADLINE_MAX_CHARS = 72;

export const SUB_HEADLINE_FIELD_KEYS = [
  "sub_headline_1",
  "sub_headline_2",
  "sub_headline_3",
  "sub_headline_4",
] as const;

export type SubHeadlineFieldKey = (typeof SUB_HEADLINE_FIELD_KEYS)[number];

export const SUB_HEADLINE_MEDIA_KINDS = ["image", "video", "caption"] as const;
export type SubHeadlineMediaKind = (typeof SUB_HEADLINE_MEDIA_KINDS)[number];

export type SubHeadlineMediaRef = {
  /** Media modality for this slot (empty = unset). */
  kind: SubHeadlineMediaKind | "";
  /** `library://{assetId}` or https URL. Empty when kind is caption-only. */
  ref: string;
  /** Caption body, or optional overlay text for image/video. */
  caption: string;
};

export const SUB_HEADLINE_MEDIA_KIND_KEYS = [
  "sub_headline_1_media_kind",
  "sub_headline_2_media_kind",
  "sub_headline_3_media_kind",
  "sub_headline_4_media_kind",
] as const;

export const SUB_HEADLINE_MEDIA_REF_KEYS = [
  "sub_headline_1_media",
  "sub_headline_2_media",
  "sub_headline_3_media",
  "sub_headline_4_media",
] as const;

export const SUB_HEADLINE_CAPTION_KEYS = [
  "sub_headline_1_caption",
  "sub_headline_2_caption",
  "sub_headline_3_caption",
  "sub_headline_4_caption",
] as const;

export function emptySubHeadlineMediaRef(): SubHeadlineMediaRef {
  return { kind: "", ref: "", caption: "" };
}

export function emptySubHeadlineMediaSlots(
  count = SUB_HEADLINE_SLOT_COUNT,
): SubHeadlineMediaRef[] {
  return Array.from({ length: count }, () => emptySubHeadlineMediaRef());
}

/** Split editorial text into up to N short lines (pad with empty strings). */
export function parseSubHeadlineSlots(
  source: string | null | undefined,
  count = SUB_HEADLINE_SLOT_COUNT,
): string[] {
  const lines = String(source ?? "")
    .split(/\r?\n+/)
    .map((line) =>
      line
        .replace(/^[-*•\d.)\s]+/, "")
        .trim()
        .slice(0, SUB_HEADLINE_MAX_CHARS),
    )
    .filter(Boolean);

  const slots = lines.slice(0, count);
  while (slots.length < count) slots.push("");
  return slots;
}

export function joinSubHeadlineSlots(slots: string[]): string {
  return slots
    .map((slot) => slot.trim().slice(0, SUB_HEADLINE_MAX_CHARS))
    .filter(Boolean)
    .join("\n");
}

export function collectSubHeadlineSlots(record: {
  sub_headline_1?: string;
  sub_headline_2?: string;
  sub_headline_3?: string;
  sub_headline_4?: string;
  summary?: string;
}): string[] {
  const fromFields = SUB_HEADLINE_FIELD_KEYS.map((key) =>
    String(record[key] ?? "").trim(),
  );
  if (fromFields.some(Boolean)) {
    return fromFields.map((slot) => slot.slice(0, SUB_HEADLINE_MAX_CHARS));
  }
  return parseSubHeadlineSlots(record.summary);
}

function isMediaKind(value: unknown): value is SubHeadlineMediaKind {
  return (
    value === "image" || value === "video" || value === "caption"
  );
}

export function parseSubHeadlineMedia(
  raw: unknown,
  count = SUB_HEADLINE_SLOT_COUNT,
): SubHeadlineMediaRef[] {
  const slots = emptySubHeadlineMediaSlots(count);
  if (!Array.isArray(raw)) return slots;

  for (let i = 0; i < count; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const bag = item as Record<string, unknown>;
    slots[i] = {
      kind: isMediaKind(bag.kind) ? bag.kind : "",
      ref: typeof bag.ref === "string" ? bag.ref.trim() : "",
      caption:
        typeof bag.caption === "string"
          ? bag.caption.trim().slice(0, 280)
          : "",
    };
  }
  return slots;
}

export function serializeSubHeadlineMedia(
  slots: SubHeadlineMediaRef[],
): SubHeadlineMediaRef[] {
  const normalized = emptySubHeadlineMediaSlots();
  for (let i = 0; i < SUB_HEADLINE_SLOT_COUNT; i += 1) {
    const slot = slots[i] ?? emptySubHeadlineMediaRef();
    normalized[i] = {
      kind: isMediaKind(slot.kind) ? slot.kind : "",
      ref: String(slot.ref ?? "").trim(),
      caption: String(slot.caption ?? "").trim().slice(0, 280),
    };
  }
  return normalized;
}

export function readSubHeadlineMediaFromStoryData(record: {
  sub_headline_1_media_kind?: string;
  sub_headline_2_media_kind?: string;
  sub_headline_3_media_kind?: string;
  sub_headline_4_media_kind?: string;
  sub_headline_1_media?: string;
  sub_headline_2_media?: string;
  sub_headline_3_media?: string;
  sub_headline_4_media?: string;
  sub_headline_1_caption?: string;
  sub_headline_2_caption?: string;
  sub_headline_3_caption?: string;
  sub_headline_4_caption?: string;
}): SubHeadlineMediaRef[] {
  return [0, 1, 2, 3].map((index) => {
    const kindRaw = String(
      record[SUB_HEADLINE_MEDIA_KIND_KEYS[index]!] ?? "",
    ).trim();
    return {
      kind: isMediaKind(kindRaw) ? kindRaw : "",
      ref: String(record[SUB_HEADLINE_MEDIA_REF_KEYS[index]!] ?? "").trim(),
      caption: String(record[SUB_HEADLINE_CAPTION_KEYS[index]!] ?? "")
        .trim()
        .slice(0, 280),
    };
  });
}

export function applySubHeadlineMediaToStoryDataFields(
  media: SubHeadlineMediaRef[],
): Record<string, string> {
  const slots = serializeSubHeadlineMedia(media);
  const patch: Record<string, string> = {};
  for (let i = 0; i < SUB_HEADLINE_SLOT_COUNT; i += 1) {
    patch[SUB_HEADLINE_MEDIA_KIND_KEYS[i]!] = slots[i]!.kind;
    patch[SUB_HEADLINE_MEDIA_REF_KEYS[i]!] = slots[i]!.ref;
    patch[SUB_HEADLINE_CAPTION_KEYS[i]!] = slots[i]!.caption;
  }
  return patch;
}
