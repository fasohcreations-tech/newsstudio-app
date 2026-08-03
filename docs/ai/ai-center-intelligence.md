# MediaOS Module 6.0 — AI Center Integration Platform

The existing AI Center remains the hub. Module 6.0 extends it into the **central intelligence platform** for Story, Scene Library, Timeline, Media Library, Graphics, Voice, and BroadcastOS.

## Principles

1. **AI never generates final videos.** Timeline Intelligence produces editable drafts only.
2. **Recommendations only.** Users must explicitly Accept or Reject.
3. **Manual edits are never auto-overwritten.** Most domains only record Accept; Timeline Intelligence Accept places editable draft beats on the project timeline (still never a rendered video).
4. **All provider calls go through the AI Orchestrator** (`generateText`) and are ledgered in `ai_jobs`.

## Architecture

```
UI panels / AI Center dashboard
  → intelligence.actions.ts (auth, rate limit, zod)
    → domain intelligence services
      → AI Orchestrator + recommendation.service
        → ai_jobs + ai_recommendations + ai_recommendation_events
```

## Seven intelligence services

| Service | Path | Capabilities |
|---------|------|----------------|
| Story | `story-intelligence.service.ts` | Headline, subheadline, summary, translate, Manglish→Malayalam, voice/handwriting cleanup, SEO, readability, grammar |
| Scene | `scene-intelligence.service.ts` | Rank Scene Library templates by story type / language / assets |
| Timeline | `timeline-intelligence.service.ts` | Editable draft timelines; regenerate scene or full draft; AI decision log |
| Asset | `asset-intelligence.service.ts` | Tags, categories, OCR, faces, duplicates, searchable descriptions |
| Graphics | `graphics-intelligence.service.ts` | Themes, palettes, typography, shape behaviors, motion presets |
| Voice | `voice-intelligence.service.ts` | STT, TTS planning, pronunciation, language detection, subtitles |
| Broadcast | `broadcast-intelligence.service.ts` | Bitrate, audio levels, safe title, subtitle readability, stream quality |

Public server actions live in `src/features/ai/intelligence/actions/intelligence.actions.ts` and are re-exported from `@/features/ai`.

## Supabase

Apply migration:

`supabase/migrations/20260324000019_ai_center_intelligence.sql`

Tables:

- `ai_recommendations` — pending / accepted / rejected suggestions with confidence, prompt/model metadata, payload JSON
- `ai_recommendation_events` — immutable accept/reject/regenerate audit trail

Existing `ai_jobs` continues as the execution ledger.

## Dashboard

`/ai-center` now shows (above the original provider/jobs dashboard):

- Story Suggestions
- Scene Recommendations
- Timeline Draft Status
- Asset Analysis
- Graphics Recommendations
- Voice Jobs
- Broadcast Health
- AI Processing Queue

## Module wiring (preserved shells)

| Module | Integration |
|--------|-------------|
| Story | `runStoryIntelligenceAction` for workspace/producer callers |
| Scene Library | `SceneIntelligencePanel` on library home |
| Creative Studio | `AiAssistantPanel` → Timeline Intelligence |
| Media Library | `AssetIntelligencePanel` in asset details |
| BroadcastOS | `BroadcastIntelligencePanel` on `/broadcast` |
| Graphics / Voice | Actions available to graphics engine & story voice tabs |

## Accept / reject UX

`RecommendationList` always requires explicit Accept or Reject.

- **Timeline drafts:** Accept places editable graphic beats on the project timeline (linked to Scene Library templates when `sceneId` is present). Never renders video.
- **Other domains:** Accept records approval; toast reminds editors to apply changes in the owning module.

## Heuristic fallback

When a provider is disabled or generation fails, services still return structured heuristic recommendations so the platform remains usable offline of live models. Live model output is preferred when available.
