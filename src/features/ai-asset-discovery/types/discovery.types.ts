/**
 * AI Asset Discovery Engine — shared types (Production Pipeline Step 2A).
 */

export type AssetDiscoveryRunStatus =
  | "draft"
  | "running"
  | "ready"
  | "failed"
  | "archived";

export type AssetDiscoveryProviderId =
  | "local_media_library"
  | "supabase_storage"
  | "organization_library"
  | "free_image"
  | "free_video"
  | "licensed_stock"
  | "news_agency"
  | "custom_search"
  | "previously_used";

export type AssetDiscoveryKind =
  | "video"
  | "image"
  | "illustration"
  | "map"
  | "icon"
  | "logo"
  | "chart"
  | "infographic"
  | "document"
  | "pdf"
  | "screenshot"
  | "other";

export type AssetDiscoveryDecision =
  | "pending"
  | "accepted"
  | "rejected"
  | "replaced";

export type StoryPanelDiscoveryContext = {
  panelIndex: number;
  storyHeadline: string;
  sceneHeadline: string;
  category: string;
  location: string;
  keywords: string[];
  entities: string[];
  language: string;
  date: string;
  bodyText?: string;
};

export type AssetSearchQuery = {
  text: string;
  kinds: AssetDiscoveryKind[];
  language?: string;
};

export type ProviderSearchInput = {
  organizationId: string;
  storyId: string;
  context: StoryPanelDiscoveryContext;
  queries: AssetSearchQuery[];
  limit?: number;
};

export type ProviderHit = {
  provider: AssetDiscoveryProviderId;
  providerAssetId: string;
  mediaAssetId?: string | null;
  assetKind: AssetDiscoveryKind;
  title: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  sourceUrl?: string | null;
  licenseInfo?: string;
  resolution?: string;
  aspectRatio?: string;
  orientation?: string;
  /** Provider-local relevance hint 0–1 before global ranking. */
  providerScore?: number;
  metadata?: Record<string, unknown>;
};

export type RankedAssetCandidate = ProviderHit & {
  relevanceScore: number;
  confidence: number;
  rank: number;
};

export type AssetDiscoveryRunRow = {
  id: string;
  organization_id: string;
  story_id: string;
  status: AssetDiscoveryRunStatus;
  panel_count: number;
  preferred_provider: AssetDiscoveryProviderId | null;
  ai_metadata: Record<string, unknown>;
  history: unknown[];
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AssetSearchRow = {
  id: string;
  organization_id: string;
  story_id: string;
  run_id: string;
  panel_index: number;
  scene_headline: string;
  story_headline: string;
  keywords: string[];
  expanded_keywords: string[];
  queries: AssetSearchQuery[];
  providers_queried: string[];
  context: Record<string, unknown>;
  created_by: string;
  created_at: string;
};

export type AssetCandidateRow = {
  id: string;
  organization_id: string;
  story_id: string;
  run_id: string;
  search_id: string | null;
  panel_index: number;
  provider: AssetDiscoveryProviderId;
  provider_asset_id: string | null;
  media_asset_id: string | null;
  asset_kind: AssetDiscoveryKind;
  title: string;
  thumbnail_url: string | null;
  preview_url: string | null;
  source_url: string | null;
  license_info: string;
  resolution: string;
  aspect_ratio: string;
  orientation: string;
  relevance_score: number;
  confidence: number;
  rank: number;
  status: AssetDiscoveryDecision;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PanelDiscoveryBundle = {
  panelIndex: number;
  sceneHeadline: string;
  search: AssetSearchRow | null;
  candidates: AssetCandidateRow[];
  approved: AssetCandidateRow | null;
  rejected: AssetCandidateRow[];
};

export type StoryDiscoveryBundle = {
  run: AssetDiscoveryRunRow | null;
  panels: PanelDiscoveryBundle[];
};

export type DiscoverStoryAssetsResult = {
  run: AssetDiscoveryRunRow;
  panels: PanelDiscoveryBundle[];
};
