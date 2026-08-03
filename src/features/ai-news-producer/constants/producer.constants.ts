/**
 * AI News Producer constants (Module 3).
 */

export const NEWS_PRODUCER_MODULE = "ai-news-producer" as const;

export const NEWS_PRODUCER_KINDS = [
  "research",
  "headlines",
  "summary",
  "keywords",
  "tags",
  "tv_script",
  "website_article",
  "youtube_description",
  "social_captions",
  "seo_metadata",
] as const;

export type NewsProducerKind = (typeof NEWS_PRODUCER_KINDS)[number];

export const NEWS_PRODUCER_KIND_LABELS: Record<NewsProducerKind, string> = {
  research: "Research",
  headlines: "Headlines",
  summary: "Sub Headlines",
  keywords: "Keywords",
  tags: "Tags",
  tv_script: "Story Script",
  website_article: "Website Article",
  youtube_description: "YouTube Description",
  social_captions: "Social Captions",
  seo_metadata: "SEO Metadata",
};

export const NEWS_PRODUCER_SECTIONS = [
  "research",
  "headline",
  "summary",
  "script",
  "media",
  "website",
  "social",
  "seo",
] as const;

export type NewsProducerSection = (typeof NEWS_PRODUCER_SECTIONS)[number];

export const NEWS_PRODUCER_SECTION_LABELS: Record<NewsProducerSection, string> =
  {
    research: "Research",
    headline: "Headline",
    summary: "Sub Headlines",
    script: "Script",
    media: "Media",
    website: "Website",
    social: "Social",
    seo: "SEO",
  };

export const NEWS_PRODUCER_SECTION_KINDS: Record<
  NewsProducerSection,
  NewsProducerKind[]
> = {
  research: ["research"],
  headline: ["headlines"],
  summary: ["summary"],
  script: ["tv_script"],
  media: [],
  website: ["website_article"],
  social: ["social_captions", "youtube_description"],
  seo: ["seo_metadata", "keywords", "tags"],
};

/** Generate buttons shown in the AI Producer tab */
export const NEWS_PRODUCER_ACTIONS = [
  {
    id: "research_story",
    label: "Research Story",
    kind: "research" as const,
    section: "research" as const,
  },
  {
    id: "generate_headlines",
    label: "Generate Headlines",
    kind: "headlines" as const,
    section: "headline" as const,
  },
  {
    id: "generate_summary",
    label: "Generate Sub Headlines",
    kind: "summary" as const,
    section: "summary" as const,
  },
  {
    id: "generate_script",
    label: "Generate Script",
    kind: "tv_script" as const,
    section: "script" as const,
  },
  {
    id: "generate_website",
    label: "Generate Website Article",
    kind: "website_article" as const,
    section: "website" as const,
  },
  {
    id: "generate_seo",
    label: "Generate SEO Metadata",
    kind: "seo_metadata" as const,
    section: "seo" as const,
  },
  {
    id: "generate_social",
    label: "Generate Social Package",
    kind: "social_captions" as const,
    section: "social" as const,
  },
] as const;

export type NewsProducerActionId = (typeof NEWS_PRODUCER_ACTIONS)[number]["id"];

export const NEWS_PRODUCER_APPROVAL_STATUSES = [
  "waiting_for_approval",
  "approved",
  "rejected",
] as const;

export type NewsProducerApprovalStatus =
  (typeof NEWS_PRODUCER_APPROVAL_STATUSES)[number];

export const NEWS_PRODUCER_APPROVAL_LABELS: Record<
  NewsProducerApprovalStatus,
  string
> = {
  waiting_for_approval: "Waiting for Approval",
  approved: "Approved",
  rejected: "Rejected",
};

/** kind → PromptManager template id */
export const NEWS_PRODUCER_PROMPT_IDS: Record<NewsProducerKind, string> = {
  research: "news.research",
  headlines: "news.headline",
  summary: "news.summary",
  keywords: "news.keywords",
  tags: "news.tags",
  tv_script: "news.tv_script",
  website_article: "news.website_article",
  youtube_description: "news.youtube_description",
  social_captions: "news.social_captions",
  seo_metadata: "news.seo_metadata",
};

/** kind → content_objects.type */
export const NEWS_PRODUCER_CONTENT_TYPES: Record<
  NewsProducerKind,
  "script" | "article" | "other"
> = {
  research: "other",
  headlines: "other",
  summary: "other",
  keywords: "other",
  tags: "other",
  tv_script: "script",
  website_article: "article",
  youtube_description: "other",
  social_captions: "other",
  seo_metadata: "other",
};
