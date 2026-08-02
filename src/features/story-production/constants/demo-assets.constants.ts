import type { StoryAssetItem } from "@/features/story-production/types/story-data.types";

const DEMO_BASE = "/demo/gnn";

export const DEMO_ASSET_PATHS = {
  logo: `${DEMO_BASE}/logo.svg`,
  reporter: `${DEMO_BASE}/reporter.svg`,
  image1: `${DEMO_BASE}/image-1.svg`,
  image2: `${DEMO_BASE}/image-2.svg`,
  image3: `${DEMO_BASE}/image-3.svg`,
  mainVideo: `${DEMO_BASE}/sample-news.mp4`,
  backgroundVideo: `${DEMO_BASE}/background-video.mp4`,
  voiceOver: `${DEMO_BASE}/sample-voice.mp3`,
  backgroundMusic: `${DEMO_BASE}/sample-music.mp3`,
} as const;

export const DEMO_STORY_ASSETS: StoryAssetItem[] = [
  {
    id: "demo-main-video",
    category: "videos",
    label: "Sample News Video",
    url: DEMO_ASSET_PATHS.mainVideo,
    bindingKey: "main_video",
    mimeType: "video/mp4",
  },
  {
    id: "demo-bg-video",
    category: "videos",
    label: "Background Video",
    url: DEMO_ASSET_PATHS.backgroundVideo,
    bindingKey: "background_video",
    mimeType: "video/mp4",
  },
  {
    id: "demo-main-image",
    category: "images",
    label: "Main Story Image",
    url: DEMO_ASSET_PATHS.image1,
    bindingKey: "main_image",
    mimeType: "image/svg+xml",
  },
  {
    id: "demo-gallery-1",
    category: "images",
    label: "Gallery Image 1",
    url: DEMO_ASSET_PATHS.image1,
    bindingKey: "image",
    mimeType: "image/svg+xml",
  },
  {
    id: "demo-gallery-2",
    category: "images",
    label: "Gallery Image 2",
    url: DEMO_ASSET_PATHS.image2,
    bindingKey: "image",
    mimeType: "image/svg+xml",
  },
  {
    id: "demo-gallery-3",
    category: "images",
    label: "Gallery Image 3",
    url: DEMO_ASSET_PATHS.image3,
    bindingKey: "image",
    mimeType: "image/svg+xml",
  },
  {
    id: "demo-reporter",
    category: "images",
    label: "Reporter Photo",
    url: DEMO_ASSET_PATHS.reporter,
    bindingKey: "reporter_photo",
    mimeType: "image/svg+xml",
  },
  {
    id: "demo-voice",
    category: "voice_over",
    label: "Sample Voice Over",
    url: DEMO_ASSET_PATHS.voiceOver,
    bindingKey: "voice_over",
    mimeType: "audio/mpeg",
  },
  {
    id: "demo-music",
    category: "music",
    label: "Background Music",
    url: DEMO_ASSET_PATHS.backgroundMusic,
    bindingKey: "background_music",
    mimeType: "audio/mpeg",
  },
  {
    id: "demo-logo",
    category: "logos",
    label: "GNN Channel Logo",
    url: DEMO_ASSET_PATHS.logo,
    bindingKey: "logo",
    mimeType: "image/svg+xml",
  },
  {
    id: "demo-script",
    category: "documents",
    label: "Story Script (placeholder)",
    url: "#",
    bindingKey: "summary",
    mimeType: "text/plain",
  },
];

export const STORY_ASSET_CATEGORIES: Array<{
  id: StoryAssetItem["category"];
  label: string;
}> = [
  { id: "videos", label: "Videos" },
  { id: "images", label: "Images" },
  { id: "voice_over", label: "Voice Overs" },
  { id: "music", label: "Music" },
  { id: "logos", label: "Logos" },
  { id: "documents", label: "Documents" },
];
