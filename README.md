# MediaOS

Enterprise AI-powered Media Operating System.

Feature 001 delivers the **platform foundation**. Feature 002 adds the **Newsroom Workspace** and **Story Manager** foundation — the Story is MediaOS’s primary business object.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Forms / validation | React Hook Form, Zod |
| Data fetching | TanStack Query |
| Backend | Supabase (PostgreSQL, Auth, Storage-ready, Realtime-ready, RLS) |

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project

## Installation

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Supabase project values from **Project Settings → API**.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (RLS-protected) |
| `NEXT_PUBLIC_APP_NAME` | No | Defaults to `MediaOS` |
| `NEXT_PUBLIC_APP_URL` | No | App origin used for auth redirects (default `http://localhost:3003`) |
| `OPENAI_API_KEY` | No | Server-only OpenAI key for AI Orchestrator |
| `GEMINI_API_KEY` | No | Server-only Gemini key (`GOOGLE_AI_API_KEY` also accepted) |
| `ANTHROPIC_API_KEY` | No | Server-only Anthropic Claude key |
| `OLLAMA_BASE_URL` | No | Server-only Ollama endpoint (e.g. `http://127.0.0.1:11434`) |
| `GOOGLE_CLOUD_TTS_CREDENTIALS` | No* | Service-account JSON for Google Cloud Text-to-Speech (*required for Voice Generation) |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | Alternate path to a GCP service-account JSON file |
| `GOOGLE_CLOUD_PROJECT` | No | Optional GCP project id for TTS |

Never commit `.env.local`. Only the anon key is used in the browser; all data access is enforced by Row Level Security.

### Supabase Auth redirect URLs

In the Supabase dashboard (**Authentication → URL Configuration**):

- **Site URL:** `http://localhost:3003`
- **Redirect URLs** (add all of these):
  - `http://localhost:3003/auth/callback`
  - `http://localhost:3003/auth/callback/recovery`
  - `http://localhost:3003/**`

Production examples:

- `https://<your-domain>/auth/callback`
- `https://<your-domain>/auth/callback/recovery`
- `https://<your-domain>/**`

## Database migrations

Apply migrations to your Supabase project (SQL editor or CLI):

```bash
npx supabase db push
# or run files in order from supabase/migrations/
```

| Migration | Contents |
| --- | --- |
| `20260324000001_foundation.sql` | profiles, organizations, workspaces, members, roles, permissions, RLS helpers |
| `20260324000002_stories.sql` | `stories` table, story status/priority enums, newsroom permissions, RLS |
| `20260324000003_org_bootstrap.sql` | `bootstrap_personal_organization` RPC (fixes first-org RLS bootstrap) |
| `20260324000004_bootstrap_ensure_profile.sql` | Ensures `profiles` row exists before membership insert |
| `20260324000005_media_library.sql` | DAM tables, story↔media links, storage buckets + RLS |
| `20260324000006_story_workspace.sql` | `story_scripts` for Story Workspace script documents |
| `20260324000007_core_content_architecture.sql` | `content_objects`, `output_packages`, `ai_jobs`, `render_jobs`, `publish_jobs` + enums/RLS |
| `20260324000008_news_intake.sql` | `source_types`, `source_items`, `story_sources` + intake RLS |
| `20260324000009_ai_production_engine.sql` | `ai_workflows`, `ai_workflow_tasks` + production enums/RLS |
| `20260324000013_creative_studio.sql` | Creative Studio projects, timelines, tracks, clips, templates |
| `20260324000014_timeline_engine.sql` | Enterprise timeline: extended track/clip kinds, story links, markers, ripple/magnetic |
| `20260324000015_graphics_engine.sql` | News graphics engine: templates, instances, variables, animations, brand kits |
| `20260324000016_motion_scene_engine.sql` | Motion scenes, layers/placeholders/variables/animations, scene versions/categories/tags |
| `20260324000017_scene_composer.sql` | Scene composer objects/components/timelines/keyframes/bindings + workflow state |

### Stories table (Feature 002)

Primary columns: `organization_id`, `title`, `subtitle`, `slug`, `summary`, `status`, `priority`, `category`, `language`, `reporter_id`, `editor_id`, `created_by`, `updated_by`, `published_at`, soft-delete via `deleted_at`.

Statuses: Draft, Assigned, In Progress, Review, Approved, Published, Archived.

Designed for future `story_versions` without implementing history yet.

## Development commands

```bash
npm run dev      # Start Next.js (Turbopack)
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint
```

## Folder structure

```text
src/
  app/                      # Next.js App Router (auth + authenticated shell)
  features/
    auth/                   # Login, logout, password recovery, guards
    profile/                # Profile page, menu, settings
    organization/           # Org/workspace/membership types + services
    newsroom/               # Newsroom workspace + Story Manager
    media/                  # Media Library / DAM
    story-workspace/        # Story production workspace
    content/                # Core content architecture (objects, jobs, packages)
    ai/                     # AI Orchestrator (providers, prompts, job manager)
    intake/                 # News Intake Center (sources → stories)
    platform/               # Command palette, notifications, shell UX
    ai-production/          # AI Production Engine (workflow + mock tasks)
    creative-studio/        # Creative Studio timeline workspace (Module 3.0)
    smart-editor/           # Universal Smart Malayalam Editor (Module 2.5)
  shared/
    components/             # App shell, providers, guards
    config/                 # Navigation + constants
    lib/supabase/           # Browser, server, middleware clients
    types/                  # Database types
  components/ui/            # shadcn/ui primitives
  hooks/                    # Shared UI hooks
  lib/                      # cn() and shared utilities
  middleware.ts             # Session refresh + route protection
supabase/
  migrations/               # SQL migrations
```

## Newsroom & Story Manager (Feature 002)

Routes:

- `/newsroom` — operational workspace (toolbar, section nav, story list, context panel)
- `/newsroom/new` — create story
- `/newsroom/[storyId]` — story details + reserved module tabs
- `/newsroom/[storyId]/edit` — edit story

Capabilities:

- Create / edit / soft-delete / restore stories
- Search, status / category / priority filters, sort, pagination
- Loading, empty, and error states
- Dashboard widgets: recent stories, draft count, review count, published today, quick create

Story detail tabs reserved (placeholders): Script, Voice Over, Timeline, Poster, Thumbnail, Publishing, Broadcast, AI Assistant, History, Analytics.

## Media Library / DAM (Feature 003)

Route: `/media-library`

Capabilities:

- Upload, drag-and-drop, multi-upload
- Folder tree, grid/list views, search, type + story filters
- Asset details panel (metadata, story links, file details, AI placeholder)
- Rename, move, soft delete, restore
- Story Media tab: upload/link/detach assets (many-to-many via `story_media`)

Storage buckets (private): `organizations`, `stories`, `shared`, `templates`, `branding`, `temporary`  
Object path convention: `{organization_id}/...`

## Story Workspace (Feature 004)

Route: `/newsroom/stories/[storyId]`  
(Legacy `/newsroom/[storyId]` redirects here.)

Layout:

- Header with title, status, reporter/editor, save indicator
- Tabs: Overview, Script, Media, Timeline, Graphics, Voice, Publishing, Broadcast, Analytics, History
- Right sidebar: Quick actions, AI placeholder, Tasks, Comments, Recent activity
- Bottom status bar: auto-save, version, current user

Script tab uses TipTap rich text with debounced autosave into `story_scripts` (version-ready).

## Core Content Architecture (Feature 004.5)

Story-centric schema connecting future AI, render, and publish modules.

Tables: `content_objects`, `output_packages`, `ai_jobs`, `render_jobs`, `publish_jobs`.  
Docs: [`docs/architecture/content-model.md`](docs/architecture/content-model.md)  
App layer: `src/features/content/` (enums, types, ContentService / AIJobService / RenderService / PublishingService).

No AI, render, or publish execution in this sprint — architecture only.

## AI Orchestrator (Feature 005)

Provider-agnostic AI engine. Modules must call the Orchestrator — never vendor SDKs directly.

Routes:

- `/ai-center` — providers, health, recent jobs, usage / cost placeholder
- `/settings/ai` — default provider, model, temperature, max tokens, timeout, retries, provider toggles

Adapters (stubs): OpenAI, Gemini, Claude, Ollama under `src/features/ai/providers/`.  
Jobs: `ai_jobs` via `AIJobManager`. Settings stored in `organizations.settings.ai`.  
API keys: server env only (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`).

## AI Center Intelligence Platform (Module 6.0)

Extends the existing AI Center into MediaOS’s central intelligence hub (does not replace it).

- Seven services: Story · Scene · Timeline · Asset · Graphics · Voice · Broadcast
- Recommendations only — explicit Accept / Reject; never auto-overwrite manual edits
- Timeline AI produces **editable drafts only** (never rendered video)
- Tables: `ai_recommendations`, `ai_recommendation_events` (migration `20260324000019`)
- Docs: [`docs/ai/ai-center-intelligence.md`](docs/ai/ai-center-intelligence.md)

## News Intake Center (Feature 006)

Route: `/intake`

Converts incoming sources into Stories (architecture only — no scraping / OCR / AI).

- Left: source types · Center: import queue · Right: preview, metadata, Create Story
- Tables: `source_types`, `source_items`, `story_sources`
- Extractor interfaces: URL, RSS, PDF, OCR, Audio, Metadata (stubs)

## Product Transformation (Sprint PT-001)

UX / platform quality (no new business features):

- **Ctrl+K** command palette + global search (stories, assets, users, orgs)
- Notification center (right sheet) · Job status bar placeholders
- Persistent sidebar cookie · Breadcrumbs · Resizable story sidebar
- Dashboard command-center widgets · Media bulk select / favorites / recent
- Design tokens for status colors · Empty states · Keyboard shortcuts

## AI Production Engine (Module 2)

Story workspace **AI Production** panel runs a mock pipeline:

Research → Editorial → Script → Translation → Voice → Timeline → Graphics → Publishing

- States: Queued / Running / Waiting for Approval / Completed / Failed / Cancelled
- Per-task Edit · Approve · Reject · Regenerate (no auto-publish)
- Settings: `/settings/ai` stage toggles + provider-per-task
- Tables: `ai_workflows`, `ai_workflow_tasks` (links optional `ai_jobs`)

## Universal Smart Malayalam Editor (Module 2.5)

Reusable TipTap editor for MediaOS text surfaces.

- Playground: `/ai-center/smart-editor`
- Story **Script** tab embeds `MediaOSEditor` (compact)
- Input: Unicode Malayalam, Manglish via Google Input Tools ([manglish.app](https://www.manglish.app/) format), voice (mock STT), handwriting (mock)
- AI tools route through the AI Orchestrator (`editor.*` job types)
- Docs: `docs/editor/smart-malayalam-editor.md`

## Creative Studio (Module 3.0)

Desktop-class manual editing workspace for news packages.

Routes:

- `/creative-studio` — project list (create, duplicate, archive, delete)
- `/creative-studio/projects/[projectId]` — timeline workspace

Layout: left explorer/media/templates · center preview + transport · bottom multi-track timeline · right inspector + AI placeholder.

Tables: `creative_studio_projects`, `creative_studio_timelines`, `creative_studio_timeline_tracks`, `creative_studio_timeline_clips`, `creative_studio_timeline_markers`, `creative_studio_timeline_links`, `creative_studio_templates`, `creative_studio_template_placeholders`.

Services (interfaces): `ProjectService`, `TimelineService`, `EnterpriseTimelineService`, `TrackService`, `ClipService`, `SelectionService`, `UndoRedoService`, `TemplateService`, `PreviewService`, `RenderService` (placeholder).

Module 3.1 adds the enterprise timeline engine: 10 newsroom track types, clip split/duplicate/delete, track collapse/resize, ripple modes, markers, story-link columns.

Not implemented in this sprint: rendering, FFmpeg, export, AI editing.

Docs: [`docs/creative-studio/creative-studio.md`](docs/creative-studio/creative-studio.md) · [`docs/creative-studio/timeline-engine.md`](docs/creative-studio/timeline-engine.md) · [`docs/creative-studio/motion-scene-engine.md`](docs/creative-studio/motion-scene-engine.md) · [`docs/creative-studio/scene-composer.md`](docs/creative-studio/scene-composer.md) · [`docs/creative-studio/gnn-broadcast-package-v1.md`](docs/creative-studio/gnn-broadcast-package-v1.md)

### News Graphics Engine (Module 3.2)

Routes:

- `/creative-studio/graphics` — template library (categories, favorites, versioning)
- `/creative-studio/graphics/[instanceId]` — editor workspace (library · canvas · timeline · inspector)

Tables: `creative_studio_brand_kits`, `creative_studio_graphic_categories`, `creative_studio_graphic_templates`, `creative_studio_graphic_variables`, `creative_studio_graphic_instances`, `creative_studio_animation_presets`.

Services: `GraphicsService`, `GraphicTemplateService`, `VariableService`, `AnimationService`, `GraphicsPreviewService`.

Not implemented: rendering, FFmpeg, AI graphics generation.

## Authentication

Implemented:

- Sign up / login / logout
- Forgot password / reset password
- Session persistence (Supabase SSR cookies)
- Protected routes (middleware + server guards)
- Role/permission guard foundations

Password reset emails redirect to `/auth/callback/recovery`, which establishes the recovery session and sends the user to `/reset-password`.

## Application shell

- Top navigation (org context, theme toggle, profile menu)
- Collapsible left sidebar with platform modules
- Main content area
- Status/footer bar
- Light and dark themes

## Security notes

- Environment variables validated at runtime (`src/shared/lib/env.ts`)
- Auth enforced in middleware and server guards
- Database access constrained by RLS
- Zod validation on auth and profile forms
- No service-role key in the client bundle

## License

Proprietary — MediaOS
