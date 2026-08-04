-- Module 3.1 — Video Rendering & Export Engine
-- Non-destructive: reads Timeline / Scene Instances; never mutates them.
-- BroadcastOS integration intentionally out of scope.

create table if not exists public.story_video_renders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  story_id uuid not null references public.stories (id) on delete cascade,
  timeline_id uuid not null references public.story_timelines (id) on delete restrict,
  status text not null default 'queued'
    check (status in (
      'queued',
      'preparing',
      'rendering',
      'encoding',
      'uploading',
      'succeeded',
      'failed',
      'cancelled'
    )),
  progress numeric(5, 2) not null default 0
    check (progress >= 0 and progress <= 100),
  format text not null default 'mp4'
    check (format in ('mp4', 'mov', 'webm')),
  resolution_width integer not null default 1920,
  resolution_height integer not null default 1080,
  frame_rate numeric(6, 3) not null default 30,
  bitrate_kbps integer not null default 8000,
  audio_codec text not null default 'aac',
  audio_channels integer not null default 2,
  audio_sample_rate integer not null default 48000,
  video_codec text not null default 'h264',
  output_bucket text,
  output_path text,
  output_url text,
  thumbnail_path text,
  thumbnail_url text,
  duration_ms integer,
  file_size_bytes bigint,
  elapsed_ms integer,
  eta_ms integer,
  error text,
  settings jsonb not null default '{}'::jsonb,
  render_plan jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid not null references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists story_video_renders_story_idx
  on public.story_video_renders (story_id, created_at desc)
  where deleted_at is null;

create index if not exists story_video_renders_org_status_idx
  on public.story_video_renders (organization_id, status)
  where deleted_at is null;

create index if not exists story_video_renders_timeline_idx
  on public.story_video_renders (timeline_id)
  where deleted_at is null;

drop trigger if exists story_video_renders_set_updated_at on public.story_video_renders;
create trigger story_video_renders_set_updated_at
  before update on public.story_video_renders
  for each row execute function public.set_updated_at();

alter table public.story_video_renders enable row level security;

create policy "story_video_renders_select_member"
  on public.story_video_renders for select
  using (
    deleted_at is null
    and public.is_org_member(organization_id)
  );

create policy "story_video_renders_insert_member"
  on public.story_video_renders for insert
  with check (
    public.is_org_member(organization_id)
    and created_by = auth.uid()
  );

create policy "story_video_renders_update_member"
  on public.story_video_renders for update
  using (
    deleted_at is null
    and public.is_org_member(organization_id)
  );

create policy "story_video_renders_delete_member"
  on public.story_video_renders for delete
  using (public.is_org_member(organization_id));

comment on table public.story_video_renders is
  'Module 3.1 Video Rendering & Export jobs. Non-destructive timeline → publishable video.';
