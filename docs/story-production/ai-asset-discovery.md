# Production Pipeline Step 2A — AI Asset Discovery Engine

Runs **after** AI Producer creates Story Panels and **before** Scene Builder generates Scene Instances.

## Objective

For **each Sub Headline**, AI-expand the line into an English stock query, then
search:

- **Pexels / Unsplash** — downloadable stock image/video  
- **YouTube Data API** — videos (link-only)  
- **Google CSE** — Google images + YouTube/Facebook pages (`site:`)  

Editor picks a hit → **Add as asset** (stock download) or **Link video**
(YouTube/Facebook URL bound to `sub_headline_media`).

Nothing is written into Scene Instances until Scene Builder runs later.

## Primary UX

1. Overview → Sub Headlines → **Find image/video** on a slot  
2. Or Story Workspace → **Assets** → AI web search per Sub Headline / all  
3. Click a result → add/link  

Browse / Generate remain available as fallbacks.

## Flow

```text
Sub Headline text
  → AI prompt discovery.web_search_query
  → Pexels / Unsplash / YouTube / Google CSE (images + social video)
  → Editor picks a hit
  → Stock: download → media_assets → library:// ref
  → YouTube/Facebook: bind https page URL
  → (later) Scene Builder
```

## Env

| Variable | Notes |
| --- | --- |
| `PEXELS_API_KEY` | Stock images + videos |
| `UNSPLASH_ACCESS_KEY` | Stock images |
| `GOOGLE_API_KEY` | YouTube Data API v3 (enable in Cloud Console) |
| `YOUTUBE_DATA_API_KEY` | Optional override |
| `GOOGLE_CSE_CX` | Programmable Search — Google images + Facebook/YouTube web hits |

## Providers (library ranking path)

Pluggable via `AssetDiscoveryProvider` for local catalog search:

| Provider | Status |
| --- | --- |
| Local Media Library | Live |
| Organization Asset Library | Live |
| Supabase Storage | Live (same catalog) |
| Previously Used GNN Assets | Live (`story_media`) |
| Free Image / Video | Stub (prefer web search above) |
| Licensed Stock | Stub |
| News Agency | Stub |
| Custom Search APIs | Stub |

## Data model

Migration `20260324000023_ai_asset_discovery.sql` (optional for web-first flow):

- `story_asset_discovery_runs`
- `story_panel_asset_searches`
- `story_panel_asset_candidates`

## Code map

```text
src/features/ai-asset-discovery/
  services/web-media-search.service.ts
  services/import-web-media.service.ts
  lib/web-search-env.ts
  actions/discovery.actions.ts   # searchWebMedia… / importWebMedia…
  components/story-asset-discovery-tab.tsx
```

Prompts: `discovery.web_search_query`, `discovery.expand_keywords`.
