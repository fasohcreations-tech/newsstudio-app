# MediaOS Asset Engine — Module 2.6 AI Visual Understanding Engine

Analyzes videos once, stores reusable timecoded metadata + embeddings, and
recommends the best clip for each Story Panel. Editors always review in the
**Asset Clip Editor** before saving. Manual editing is never replaced.

## Flow

```text
Video selected / imported
        │
        ▼
 Visual analysis (heuristic + Orchestrator)
        │
        ▼
 media_asset_analyses + events + embeddings
        │
 Story Panel context (headline, keywords, voice duration)
        │
        ▼
 Semantic clip recommendation
        │
        ▼
 Clip Editor rail → Preview / Adjust / Accept / Reject / Another
        │
        ▼
 Asset Clip (clip://) attached to Story Panel
```

## Capabilities

- Inputs: YouTube URL assets, uploads, Supabase Storage / Media Library, Discovery imports
- Analysis: scene boundaries, shot changes, keyframes, transcript, OCR/face/object/logo/landmark/location/action drafts, keywords, embeddings, timecoded events
- Recommendation: suggested IN/OUT, confidence, reason
- Editor: preview, accept (with adjusted IN/OUT), reject, request another, save as Asset Clip
- Persistence: analysis reused unless force-reprocessed

## Schema

Migration `20260324000025_ai_visual_understanding.sql`:

- `media_asset_analyses`
- `media_asset_analysis_events`
- `media_asset_embeddings`
- `story_panel_clip_suggestions`

## Routes

- `/media-library/clip-editor?asset=&storyId=&panel=` — Clip Editor + AI rail
- Story form **Suggest clip** deep-links with panel context

## Code map

```text
src/features/ai-visual-understanding/
  actions/visual.actions.ts
  components/clip-ai-recommendation-rail.tsx
  lib/embeddings.ts, heuristic-analysis.ts
  services/visual-analysis.service.ts
  services/clip-recommendation.service.ts
  schemas/, types/

src/features/ai/prompts/vision/
```

Apply the migration before using Visual Understanding in a live Supabase project.

Frame-level vision (true OCR/faces/speech) enriches the same tables when multimodal providers are enabled; until then packages are heuristic + LLM metadata with durable storage for reuse.
