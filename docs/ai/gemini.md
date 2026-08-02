# MediaOS — Google Gemini Integration (Module 2.1)

Production-ready Gemini provider wired through the **AI Orchestrator**.  
UI components never call Gemini directly.

## Setup

1. Install dependency (already in the repo):

```bash
npm install @google/genai
```

> MediaOS uses the current official SDK `@google/genai` (GA).  
> Legacy `@google/generative-ai` is deprecated by Google.

2. Apply migration (optional story binding for AI Center jobs):

```text
supabase/migrations/20260324000011_ai_jobs_story_optional.sql
```

3. Set server env vars in `.env.local` (never `NEXT_PUBLIC_*`):

```bash
GOOGLE_API_KEY=your-google-ai-studio-key
DEFAULT_AI_PROVIDER=gemini
DEFAULT_GEMINI_MODEL=gemini-3.5-flash
AI_REQUEST_TIMEOUT=60000
```

4. Restart `npm run dev`.

5. Open **Settings → AI**, enable **Google Gemini**, set model to `gemini-3.5-flash`, save.

6. Open **AI Center → Gemini Test** and run Generate Text.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_API_KEY` | Yes (for Gemini) | Google AI Studio / Gemini API key |
| `GEMINI_API_KEY` | Fallback | Accepted if `GOOGLE_API_KEY` is unset |
| `GOOGLE_AI_API_KEY` | Fallback | Legacy alias |
| `DEFAULT_AI_PROVIDER` | No | Seed default when org settings are empty (`gemini` recommended) |
| `DEFAULT_GEMINI_MODEL` | No | Default model id (`gemini-3.5-flash`) |
| `AI_REQUEST_TIMEOUT` | No | Request timeout in ms (default `60000`) |

Keys are read only in `src/features/ai/lib/server-env.ts` (`server-only`).

## Architecture

```
UI (AI Center / Settings / Story Workspace)
        │
        ▼
Server Actions (ai-generate.actions.ts)
        │  validate · rate-limit · auth
        ▼
AI Orchestrator (services/ai-orchestrator.ts)
        │  org settings · prompt render · ai_jobs ledger · retries
        ▼
Provider Registry → GeminiProvider
        │
        ▼
gemini-client.ts → @google/genai (GoogleGenAI)
```

### Provider files

```
src/features/ai/providers/gemini/
  gemini-client.ts      # SDK client, timeout, error mapping
  gemini-provider.ts    # AIProvider implementation
  prompt-manager.ts     # Gemini content / JSON shaping
  index.ts              # barrel
```

`GeminiProvider` implements:

- `generateText()`
- `generateStructuredOutput()`
- `streamText()`
- `healthCheck()`
- `estimateCost()` (placeholder USD rates)

`generateImage()` stays unimplemented (out of scope for 2.1).

## Request flow

1. Client calls `generateTextAction` with prompt / model / temperature.
2. Action authenticates, checks org membership, rate-limits (20/min/user).
3. Action calls `AIOrchestrator.generateText` — **not** the Gemini SDK.
4. Orchestrator loads org AI settings (provider, model, temperature, topP, topK, maxTokens, timeout, retries).
5. Orchestrator enqueues `ai_jobs`, marks running, calls `getAIProvider("gemini").generateText()`.
6. `GeminiProvider` uses `createGeminiClient()` + `@google/genai`.
7. Success → job succeeded + token/cost placeholders; failure → mapped error codes (`invalid_api_key`, `rate_limit`, `timeout`, `network`, `provider_offline`).

## AI Settings

Org settings (`organizations.settings.ai`) include:

- Provider (default + per-provider enable/model)
- Model
- Temperature
- Top P
- Top K
- Max output tokens
- Timeout (ms)
- Retry count

UI: `/settings/ai`

## Test routes

| Route | Purpose |
|-------|---------|
| `/ai-center` | Dashboard + link to Gemini Test |
| `/ai-center/gemini-test` | Prompt / model / temperature → response, timing, tokens, errors |
| `/settings/ai` | Enable Gemini + tune generation params |

## Security

- Server-side only (`server-only` modules)
- No API key in client bundles
- Zod validation on actions
- In-memory rate limiting on generate / health
- Failures logged via `console.error` with job context

## Out of scope (intentionally)

- Script generation
- Translation pipelines
- Image generation
- Voice generation

Those modules will call the same orchestrator later.
