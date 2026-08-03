# Editorial Approval & Voice Generation

Production Pipeline **Step 1** — approve a story script, then synthesize voice with Google Cloud Text-to-Speech. Scene generation is out of scope.

## Workflow

1. Edit headline / summary (Newsroom metadata) and script (Story Workspace → Script).
2. Click **Approve Script** — stores `approved_script`, `approved_by`, `approved_at`, and may set story `status` to `approved`.
3. Open **Voice** tab → choose Malayalam / English neural voice, rate, pitch, volume.
4. **Generate Voice** / **Regenerate Voice** → Google Cloud TTS → MP3 in Supabase Storage (`stories` bucket).
5. **Preview Voice** / **Download Voice** via signed URL.

Changing the script after approval marks voice as `stale` until regenerate.

## TTS providers

1. **Gemini TTS** (default) — uses `GOOGLE_API_KEY` / `GEMINI_API_KEY`. 30 prebuilt voices. Malayalam + English auto-detected. Optional `GEMINI_TTS_MODEL` (default `gemini-2.5-flash-preview-tts`).
2. **Google Cloud TTS** — service-account file via `GOOGLE_APPLICATION_CREDENTIALS`. WaveNet / Neural2 / Studio voices with rate/pitch/volume.

Switch providers in the Voice tab. Hear samples before generating.

## Database

Apply migration:

`supabase/migrations/20260324000020_story_editorial_voice.sql`

Key `stories` columns: `approved_script`, `approved_by`, `approved_at`, `voice_status`, `voice_url`, `voice_duration_ms`, `voice_name`, `voice_language`, `voice_speaking_rate`, `voice_pitch`, `voice_volume_gain_db`, `voice_generated_at`, `voice_error`, `voice_storage_path`.

## Code map

| Area | Path |
|------|------|
| Actions | `src/features/story-voice/actions/voice.actions.ts` |
| TTS | `src/features/story-voice/services/google-cloud-tts.service.ts` |
| Approve / generate | `src/features/story-voice/services/editorial-voice.service.ts` |
| Script UI | `src/features/story-workspace/components/tabs/script-tab.tsx` |
| Voice UI | `src/features/story-workspace/components/tabs/voice-tab.tsx` |

## Limits

- Approved plain text capped at ~4,500 characters per Google TTS request.
- Does not render video or create scenes.
