import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseJsonObject } from "@/features/ai/intelligence/lib/parse-json-response";
import { generateText } from "@/features/ai/services/ai-orchestrator";
import {
  getWebMediaSearchEnv,
  hasWebMediaSearchConfigured,
} from "@/features/ai-asset-discovery/lib/web-search-env";
import type { SubHeadlineMediaFilter } from "@/features/ai-asset-discovery/lib/query-builder";

export type WebMediaProvider =
  | "pexels"
  | "unsplash"
  | "google_cse"
  | "youtube"
  | "facebook";

export type WebMediaHit = {
  id: string;
  provider: WebMediaProvider;
  kind: "image" | "video";
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  pageUrl: string;
  photographer?: string;
  licenseInfo: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  mimeTypeHint?: string;
  /**
   * YouTube / Facebook / other hosted pages — bind the page URL instead of
   * downloading binary media.
   */
  linkOnly?: boolean;
};

export type WebMediaSearchResult = {
  query: string;
  altQueries: string[];
  hits: WebMediaHit[];
  providersUsed: string[];
  warning?: string;
};

type SearchInput = {
  organizationId: string;
  userId: string;
  storyId: string;
  sceneHeadline: string;
  storyHeadline: string;
  category?: string;
  language?: string;
  mediaFilter?: SubHeadlineMediaFilter;
  limit?: number;
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isYouTubeHost(host: string): boolean {
  return (
    host === "youtube.com" ||
    host === "youtu.be" ||
    host === "m.youtube.com" ||
    host.endsWith(".youtube.com")
  );
}

function isFacebookHost(host: string): boolean {
  return (
    host === "facebook.com" ||
    host === "fb.watch" ||
    host === "fb.com" ||
    host === "m.facebook.com" ||
    host.endsWith(".facebook.com")
  );
}

function uniqueQueries(...parts: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const q = (part ?? "").trim().replace(/\s+/g, " ");
    if (!q) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q.slice(0, 100));
  }
  return out;
}

async function buildSearchQuery(
  client: SupabaseClient,
  input: SearchInput,
): Promise<{ query: string; altQueries: string[] }> {
  const seed = input.sceneHeadline.trim() || input.storyHeadline.trim();
  const fallback = {
    query: seed.slice(0, 80) || "news broadcast",
    altQueries: uniqueQueries(
      input.storyHeadline,
      seed ? `${seed} news` : undefined,
    ).filter((q) => q.toLowerCase() !== seed.toLowerCase()),
  };

  try {
    const live = await generateText(client, {
      organizationId: input.organizationId,
      userId: input.userId,
      storyId: input.storyId,
      jobType: "asset_discovery.web_search_query",
      promptId: "discovery.web_search_query",
      promptVariables: {
        scene_headline: input.sceneHeadline || seed,
        story_headline: input.storyHeadline || seed,
        category: input.category || "general",
        language: input.language || "en",
        media_filter: input.mediaFilter || "both",
      },
      locale: input.language?.startsWith("ml") ? "ml" : "en",
    });

    if (!live.data?.text) return fallback;
    const parsed = parseJsonObject<{ query?: string; alt_queries?: string[] }>(
      live.data.text,
    );
    const query = (parsed?.query || "").trim() || fallback.query;
    const altQueries = uniqueQueries(
      ...(parsed?.alt_queries ?? []).map((q) => String(q)),
      input.sceneHeadline,
      input.storyHeadline,
    )
      .filter((q) => q.toLowerCase() !== query.toLowerCase())
      .slice(0, 3);
    return { query, altQueries };
  } catch {
    return fallback;
  }
}

async function searchPexelsPhotos(
  apiKey: string,
  query: string,
  limit: number,
): Promise<WebMediaHit[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.min(24, limit)));
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    photos?: Array<{
      id: number;
      alt?: string;
      url?: string;
      photographer?: string;
      width?: number;
      height?: number;
      src?: {
        large?: string;
        large2x?: string;
        original?: string;
        medium?: string;
      };
    }>;
  };

  return (json.photos ?? []).map((photo) => {
    const download =
      photo.src?.large2x || photo.src?.large || photo.src?.original || "";
    const thumb = photo.src?.medium || photo.src?.large || download;
    return {
      id: `pexels-photo-${photo.id}`,
      provider: "pexels" as const,
      kind: "image" as const,
      title: photo.alt?.trim() || `Pexels photo ${photo.id}`,
      thumbnailUrl: thumb,
      previewUrl: download,
      downloadUrl: download,
      pageUrl: photo.url || `https://www.pexels.com/photo/${photo.id}/`,
      photographer: photo.photographer,
      licenseInfo: "Pexels License (free to use)",
      width: photo.width,
      height: photo.height,
      mimeTypeHint: "image/jpeg",
    };
  });
}

async function searchPexelsVideos(
  apiKey: string,
  query: string,
  limit: number,
): Promise<WebMediaHit[]> {
  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.min(12, limit)));

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    videos?: Array<{
      id: number;
      url?: string;
      image?: string;
      duration?: number;
      user?: { name?: string };
      video_files?: Array<{
        id: number;
        quality?: string;
        file_type?: string;
        width?: number;
        height?: number;
        link?: string;
      }>;
    }>;
  };

  return (json.videos ?? []).map((video) => {
    const files = [...(video.video_files ?? [])].sort((a, b) => {
      const rank = (q?: string) => (q === "hd" ? 2 : q === "sd" ? 1 : 0);
      return rank(b.quality) - rank(a.quality);
    });
    const file = files[0];
    const download = file?.link || "";
    return {
      id: `pexels-video-${video.id}`,
      provider: "pexels" as const,
      kind: "video" as const,
      title: `Pexels video ${video.id}`,
      thumbnailUrl: video.image || "",
      previewUrl: download,
      downloadUrl: download,
      pageUrl: video.url || `https://www.pexels.com/video/${video.id}/`,
      photographer: video.user?.name,
      licenseInfo: "Pexels License (free to use)",
      width: file?.width,
      height: file?.height,
      durationSeconds: video.duration,
      mimeTypeHint: file?.file_type || "video/mp4",
    };
  });
}

async function searchUnsplash(
  accessKey: string,
  query: string,
  limit: number,
): Promise<WebMediaHit[]> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.min(20, limit)));
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    results?: Array<{
      id: string;
      description?: string | null;
      alt_description?: string | null;
      links?: { html?: string };
      urls?: { regular?: string; small?: string; full?: string };
      user?: { name?: string };
      width?: number;
      height?: number;
    }>;
  };

  return (json.results ?? []).map((photo) => {
    const download = photo.urls?.regular || photo.urls?.full || "";
    const thumb = photo.urls?.small || download;
    return {
      id: `unsplash-${photo.id}`,
      provider: "unsplash" as const,
      kind: "image" as const,
      title:
        photo.alt_description?.trim() ||
        photo.description?.trim() ||
        `Unsplash ${photo.id}`,
      thumbnailUrl: thumb,
      previewUrl: download,
      downloadUrl: download,
      pageUrl: photo.links?.html || `https://unsplash.com/photos/${photo.id}`,
      photographer: photo.user?.name,
      licenseInfo: "Unsplash License (free to use)",
      width: photo.width,
      height: photo.height,
      mimeTypeHint: "image/jpeg",
    };
  });
}

async function searchYouTubeVideos(
  apiKey: string,
  queries: string[],
  limit: number,
): Promise<{ hits: WebMediaHit[]; error?: string }> {
  const hits: WebMediaHit[] = [];
  const seenIds = new Set<string>();
  let lastError: string | undefined;

  for (const query of queries) {
    if (hits.length >= limit) break;

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", query);
    url.searchParams.set(
      "maxResults",
      String(Math.min(15, Math.max(5, limit - hits.length))),
    );
    url.searchParams.set("safeSearch", "moderate");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let detail = `YouTube HTTP ${res.status}`;
      try {
        const err = JSON.parse(body) as { error?: { message?: string } };
        if (err.error?.message) detail = `YouTube: ${err.error.message}`;
      } catch {
        /* keep */
      }
      console.warn("[WebMediaSearch]", detail, body.slice(0, 240));
      lastError = detail;
      continue;
    }

    const json = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: {
            medium?: { url?: string; width?: number; height?: number };
            high?: { url?: string; width?: number; height?: number };
            default?: { url?: string };
          };
        };
      }>;
    };

    for (const item of json.items ?? []) {
      const videoId = item.id?.videoId;
      if (!videoId || seenIds.has(videoId)) continue;
      seenIds.add(videoId);
      const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const thumbs = item.snippet?.thumbnails;
      const thumb =
        thumbs?.medium?.url ||
        thumbs?.high?.url ||
        thumbs?.default?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      hits.push({
        id: `youtube-${videoId}`,
        provider: "youtube",
        kind: "video",
        title: item.snippet?.title?.trim() || `YouTube ${videoId}`,
        thumbnailUrl: thumb,
        previewUrl: pageUrl,
        downloadUrl: pageUrl,
        pageUrl,
        photographer: item.snippet?.channelTitle,
        licenseInfo:
          "YouTube — link only; verify embed / rights before broadcast",
        width: thumbs?.medium?.width ?? thumbs?.high?.width,
        height: thumbs?.medium?.height ?? thumbs?.high?.height,
        mimeTypeHint: "video/youtube",
        linkOnly: true,
      });
      if (hits.length >= limit) break;
    }
  }

  return {
    hits,
    error: hits.length === 0 ? lastError : undefined,
  };
}

async function searchGoogleCseImages(
  apiKey: string,
  cx: string,
  query: string,
  limit: number,
): Promise<{ hits: WebMediaHit[]; error?: string }> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", String(Math.min(10, limit)));
  url.searchParams.set("safe", "active");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = `Google CSE images HTTP ${res.status}`;
    try {
      const err = JSON.parse(body) as {
        error?: { message?: string; status?: string };
      };
      if (err.error?.message) detail = `Google CSE images: ${err.error.message}`;
    } catch {
      /* keep detail */
    }
    console.warn("[WebMediaSearch]", detail, body.slice(0, 300));
    return { hits: [], error: detail };
  }

  const json = (await res.json()) as {
    items?: Array<{
      title?: string;
      link?: string;
      image?: {
        contextLink?: string;
        thumbnailLink?: string;
        width?: number;
        height?: number;
      };
      mime?: string;
    }>;
  };

  const hits = (json.items ?? [])
    .filter((item) => Boolean(item.link))
    .map((item, index) => ({
      id: `gcs-img-${index}-${Buffer.from(item.link || "")
        .toString("base64url")
        .slice(0, 16)}`,
      provider: "google_cse" as const,
      kind: "image" as const,
      title: item.title?.trim() || "Google image",
      thumbnailUrl: item.image?.thumbnailLink || item.link || "",
      previewUrl: item.link || "",
      downloadUrl: item.link || "",
      pageUrl: item.image?.contextLink || item.link || "",
      licenseInfo: "Google Image Search — verify license before broadcast use",
      width: item.image?.width,
      height: item.image?.height,
      mimeTypeHint: item.mime || "image/jpeg",
    }));

  return { hits };
}

/**
 * Google web search scoped to YouTube + Facebook video pages.
 */
async function searchGoogleCseSocialVideos(
  apiKey: string,
  cx: string,
  query: string,
  limit: number,
): Promise<{ hits: WebMediaHit[]; error?: string }> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set(
    "q",
    `${query} (site:youtube.com OR site:youtu.be OR site:facebook.com OR site:fb.watch)`,
  );
  url.searchParams.set("num", String(Math.min(10, limit)));
  url.searchParams.set("safe", "active");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = `Google CSE web HTTP ${res.status}`;
    try {
      const err = JSON.parse(body) as {
        error?: { message?: string };
      };
      if (err.error?.message) detail = `Google CSE web: ${err.error.message}`;
    } catch {
      /* keep */
    }
    console.warn("[WebMediaSearch]", detail, body.slice(0, 300));
    return { hits: [], error: detail };
  }

  const json = (await res.json()) as {
    items?: Array<{
      title?: string;
      link?: string;
      displayLink?: string;
      snippet?: string;
      pagemap?: {
        cse_thumbnail?: Array<{ src?: string; width?: string; height?: string }>;
        cse_image?: Array<{ src?: string }>;
        videoobject?: Array<{ thumbnailurl?: string; duration?: string }>;
      };
    }>;
  };

  const hits = (json.items ?? [])
    .filter((item) => Boolean(item.link))
    .map((item, index) => {
      const link = item.link || "";
      const host = hostOf(link);
      const yt = isYouTubeHost(host);
      const fb = isFacebookHost(host);
      const provider: WebMediaProvider = yt
        ? "youtube"
        : fb
          ? "facebook"
          : "google_cse";
      const thumb =
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        item.pagemap?.videoobject?.[0]?.thumbnailurl ||
        item.pagemap?.cse_image?.[0]?.src ||
        "";
      const thumbW = Number(item.pagemap?.cse_thumbnail?.[0]?.width);
      const thumbH = Number(item.pagemap?.cse_thumbnail?.[0]?.height);

      return {
        id: `gcs-vid-${provider}-${index}-${Buffer.from(link)
          .toString("base64url")
          .slice(0, 16)}`,
        provider,
        kind: "video" as const,
        title: item.title?.trim() || item.snippet?.trim() || "Social video",
        thumbnailUrl: thumb,
        previewUrl: link,
        downloadUrl: link,
        pageUrl: link,
        photographer: item.displayLink,
        licenseInfo: yt
          ? "YouTube — link only; verify embed / rights before broadcast"
          : fb
            ? "Facebook — link only; verify rights before broadcast"
            : "Google Search — verify license before broadcast use",
        width: Number.isFinite(thumbW) ? thumbW : undefined,
        height: Number.isFinite(thumbH) ? thumbH : undefined,
        mimeTypeHint: yt ? "video/youtube" : fb ? "video/facebook" : "text/html",
        linkOnly: true,
      };
    })
    .filter((hit) => hit.provider === "youtube" || hit.provider === "facebook");

  return { hits };
}

/** Round-robin mix so Pexels does not crowd out YouTube / Google / Facebook. */
function interleaveByProvider(hits: WebMediaHit[], max: number): WebMediaHit[] {
  const preferred: WebMediaProvider[] = [
    "pexels",
    "youtube",
    "facebook",
    "google_cse",
    "unsplash",
  ];
  const buckets = new Map<WebMediaProvider, WebMediaHit[]>();
  for (const hit of hits) {
    const list = buckets.get(hit.provider) ?? [];
    list.push(hit);
    buckets.set(hit.provider, list);
  }
  const order = [
    ...preferred.filter((p) => buckets.has(p)),
    ...[...buckets.keys()].filter((p) => !preferred.includes(p)),
  ];
  const out: WebMediaHit[] = [];
  let row = 0;
  while (out.length < max) {
    let added = false;
    for (const provider of order) {
      const hit = buckets.get(provider)?.[row];
      if (!hit) continue;
      out.push(hit);
      added = true;
      if (out.length >= max) break;
    }
    if (!added) break;
    row += 1;
  }
  return out;
}

/**
 * AI query from Sub Headline → stock + Google / YouTube / Facebook video search.
 */
export async function searchWebMediaForSubHeadline(
  client: SupabaseClient,
  input: SearchInput,
): Promise<{ data: WebMediaSearchResult | null; error: string | null }> {
  if (!hasWebMediaSearchConfigured()) {
    return {
      data: null,
      error:
        "Web media search is not configured. Add PEXELS_API_KEY and/or enable YouTube Data API on GOOGLE_API_KEY (optional: GOOGLE_CSE_CX for Google/Facebook). Restart the server.",
    };
  }

  const mediaFilter = input.mediaFilter ?? "both";
  const limit = input.limit ?? 12;
  const { query, altQueries } = await buildSearchQuery(client, input);
  const env = getWebMediaSearchEnv();
  const providersUsed: string[] = [];
  const providerErrors: string[] = [];
  const hits: WebMediaHit[] = [];

  // Always fan out: AI query + Sub Headline + Story title (YouTube often needs the broader title).
  const queries = uniqueQueries(
    query,
    ...altQueries,
    input.sceneHeadline,
    input.storyHeadline,
    input.category ? `${input.sceneHeadline} ${input.category}` : undefined,
  ).slice(0, 4);

  const stockQueries = queries.slice(0, 2);
  const youtubeQueries = queries;

  const tasks: Array<Promise<void>> = [];

  if (env.PEXELS_API_KEY) {
    for (const q of stockQueries) {
      if (mediaFilter !== "video") {
        tasks.push(
          searchPexelsPhotos(env.PEXELS_API_KEY, q, limit).then((photos) => {
            if (photos.length) {
              providersUsed.push("pexels");
              hits.push(...photos);
            }
          }),
        );
      }
      if (mediaFilter !== "image") {
        tasks.push(
          searchPexelsVideos(env.PEXELS_API_KEY, q, Math.ceil(limit / 2)).then(
            (videos) => {
              if (videos.length) {
                providersUsed.push("pexels");
                hits.push(...videos);
              }
            },
          ),
        );
      }
    }
  }

  if (env.UNSPLASH_ACCESS_KEY && mediaFilter !== "video") {
    tasks.push(
      searchUnsplash(env.UNSPLASH_ACCESS_KEY, stockQueries[0]!, limit).then(
        (photos) => {
          if (photos.length) {
            providersUsed.push("unsplash");
            hits.push(...photos);
          }
        },
      ),
    );
  }

  const youtubeKey =
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.GOOGLE_CSE_API_KEY?.trim() ||
    env.YOUTUBE_DATA_API_KEY;

  if (youtubeKey && mediaFilter !== "image") {
    tasks.push(
      searchYouTubeVideos(youtubeKey, youtubeQueries, Math.max(limit, 10)).then(
        (result) => {
          if (result.error) providerErrors.push(result.error);
          if (result.hits.length) {
            providersUsed.push("youtube");
            hits.push(...result.hits);
          } else if (!result.error) {
            providerErrors.push(
              `YouTube: no videos for “${youtubeQueries[0] ?? query}”`,
            );
          }
        },
      ),
    );
  }

  if (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_CX) {
    const cseKey =
      process.env.GOOGLE_CSE_API_KEY?.trim() || env.GOOGLE_CSE_API_KEY;
    const q = stockQueries[0]!;

    if (mediaFilter !== "video") {
      tasks.push(
        searchGoogleCseImages(cseKey, env.GOOGLE_CSE_CX, q, limit).then(
          (result) => {
            if (result.error) providerErrors.push(result.error);
            if (result.hits.length) {
              providersUsed.push("google_cse");
              hits.push(...result.hits);
            }
          },
        ),
      );
    }
    if (mediaFilter !== "image") {
      tasks.push(
        searchGoogleCseSocialVideos(cseKey, env.GOOGLE_CSE_CX, q, limit).then(
          (result) => {
            if (result.error) providerErrors.push(result.error);
            for (const video of result.hits) {
              providersUsed.push(video.provider);
              hits.push(video);
            }
          },
        ),
      );
    }
  }

  await Promise.all(tasks);

  const seen = new Set<string>();
  const unique = hits.filter((hit) => {
    const key = hit.pageUrl || hit.downloadUrl || hit.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const filtered =
    mediaFilter === "video"
      ? unique.filter((h) => h.kind === "video")
      : mediaFilter === "image"
        ? unique.filter((h) => h.kind === "image")
        : unique;

  const capped = interleaveByProvider(filtered, Math.max(limit * 2, 24));

  const warningParts: string[] = [];
  if (capped.length === 0) {
    warningParts.push(
      "No web results for this Sub Headline. Try different wording.",
    );
  }
  const youtubeMissing =
    mediaFilter !== "image" &&
    Boolean(youtubeKey) &&
    !providersUsed.includes("youtube");
  if (youtubeMissing) {
    const ytErr = providerErrors.find((e) => /youtube/i.test(e));
    warningParts.push(
      ytErr ||
        "YouTube returned no results for this Sub Headline (tried title + line).",
    );
  }
  if (providerErrors.some((e) => /Custom Search|CSE/i.test(e))) {
    warningParts.push(
      "Google CSE: enable Custom Search JSON API on the Cloud project (billing required).",
    );
  }

  return {
    data: {
      query,
      altQueries,
      hits: capped,
      providersUsed: [...new Set(providersUsed)],
      warning: warningParts.length ? warningParts.join(" ") : undefined,
    },
    error: null,
  };
}
