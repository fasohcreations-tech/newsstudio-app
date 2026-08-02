# MediaOS Universal Smart Malayalam Editor

Module **2.5** — reusable enterprise editor for all MediaOS text surfaces.

## Route

- Playground: [`/ai-center/smart-editor`](/ai-center/smart-editor)
- Story Script tab embeds the same component in compact mode

## Folder structure

```
src/features/smart-editor/
  actions/           # editor-ai.actions, editor-draft.actions
  components/        # MediaOSEditor + toolbars/panels
  constants/
  hooks/             # useEditor, useVoiceInput, useManglish, …
  lib/               # TipTap extensions, metrics, AI prompts
  services/
    interfaces/      # provider-agnostic contracts
    providers/       # mock STT/handwriting + rule-based Manglish + registry
    editor-draft.service.ts
  types/
  index.ts
```

## Components

| Component | Role |
|-----------|------|
| `MediaOSEditor` | Full / compact shell |
| `Toolbar` | Rich text formatting |
| `LanguageToolbar` | ML / EN / Manglish + newsroom formats |
| `VoiceToolbar` | Start / Pause / Resume / Stop / Cancel + live transcript |
| `HandwritingPanel` | Canvas (mouse / touch / stylus), lazy-loaded |
| `SuggestionPanel` | Phrases + spell suggestions |
| `AIActionPanel` | Improve, rewrite, SEO, fact-check, … via Orchestrator |
| `StatusBar` | Words, chars, reading time, language, unsaved |
| `VersionIndicator` | Editor format version + revision |

## Hooks

- `useEditor` / `useMediaOSEditor`
- `useVoiceInput` — lazy-loads STT provider
- `useManglish` — auto / Convert button
- `useHandwriting` — lazy-loads recognition provider
- `useAutoSave` — 5s interval
- `useEditorHistory` — local snapshot placeholder

## Services (interfaces)

Swap implementations with `configureEditorProviders()` — **do not** hardcode vendors in UI:

| Interface | Default provider |
|-----------|------------------|
| `SpeechToTextService` | `mock_stt` |
| `HandwritingRecognitionService` | `mock_handwriting` |
| `ManglishService` | `google_input_tools_ml` (manglish.app format; Mozhi fallback) |
| `SpellCheckService` | `mock_spell` |
| `TranslationService` | `mock_translation` |
| AI transforms | `runEditorAIAction` → AI Orchestrator |

Future plugs: Google Speech-to-Text, OpenAI Whisper, Azure Speech, Google Input Tools, commercial handwriting engines.

## Manglish (manglish.app format)

Default engine: **Google Input Tools** Malayalam (`itc=ml-t-i0-und`) — the same transliteration format used by [manglish.app](https://www.manglish.app/) / Google Input Tools.

- Proxy: `GET /api/editor/manglish?text=namaskaram`
- Provider: `google_input_tools_ml` (registry default)
- Offline fallback: local Mozhi/lexicon (`rule_based_manglish`)

Example: `namaskaram` → `നമസ്കാരം` with ranked alternatives in the suggestion strip.

## Persistence

Reuses **`content_objects`** (type `article`, `metadata.module = "smart_editor"`):

- `editorVersion`, `bodyHtml`, `bodyPlain`, `language`, `revision`, `lastCursorPosition`, `newsroomFormat`, `autosavedAt`

Story Script continues to use `story_scripts` via the existing workspace autosave path; the Script tab embeds `MediaOSEditor` for the editing surface.

## Keyboard shortcuts

Ctrl+B / I / U (TipTap), Ctrl+S save, Ctrl+Z / Ctrl+Shift+Z, Ctrl+F find, Ctrl+H replace, Ctrl+K link.

## Future TODOs

1. Wire real STT providers behind `SpeechToTextService`
2. Wire handwriting OCR provider
3. Improve Manglish lexicon / Google Input Tools adapter
4. Server-backed version history (not local snapshots)
5. Dictionary / synonym / autocomplete services
6. Paste-without-formatting command in toolbar
7. High-contrast theme polish + full a11y audit
8. Migrate remaining Textareas (AI Producer drafts, captions) onto `MediaOSEditor`
