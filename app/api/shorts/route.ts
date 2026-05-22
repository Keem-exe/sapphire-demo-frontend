import { NextResponse } from "next/server";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";

const YT_SEARCH = "https://www.googleapis.com/youtube/v3/search";
const YT_VIDEOS = "https://www.googleapis.com/youtube/v3/videos";
const MAX_REEL_DURATION_SECONDS = 180;

const SUBJECT_ALIASES: Record<string, SubjectId> = {
  "1": "csec-math",
  "2": "csec-eng",
  "3": "csec-chem",
  "4": "cape-phys",
  "5": "cape-bio",
  "6": "cape-puremath",
  "csec-english": "csec-eng",
  "csec-chemistry": "csec-chem",
  "cape-puremaths": "cape-puremath",
  "cape-puremath": "cape-puremath",
  "cape-physics": "cape-phys",
  "cape-biology": "cape-bio",
};

const SUBJECT_SEARCH_TERMS: Record<SubjectId, string[]> = {
  "csec-math": ["CSEC Mathematics", "CSEC Math"],
  "csec-chem": ["CSEC Chemistry", "CSEC Chem"],
  "csec-eng": ["CSEC English Language", "CSEC English A"],
  "cape-puremath": ["CAPE Pure Mathematics", "CAPE Pure Math"],
  "cape-phys": ["CAPE Physics"],
  "cape-bio": ["CAPE Biology", "CAPE Bio"],
};

type ReelItem = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  durationSec: number;
  durationLabel: string;
  thumbnail: string;
  topic: string;
  viewCount: number;
  viewCountLabel: string;
  embedUrl: string;
  watchUrl: string;
};

type YouTubeVideoItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
  };
  status?: {
    embeddable?: boolean;
  };
};

type QueryResult = {
  items: ReelItem[];
  nextPageToken: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function normalizeSubjectId(value: string | null): SubjectId | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  const canonical = SUBJECT_ALIASES[normalized] || normalized;
  return canonical in SUBJECTS ? (canonical as SubjectId) : null;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9& ]+/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeTopic(subjectId: SubjectId, value: string | null): string | null {
  const requested = String(value || "").trim();
  if (!requested) return null;

  const exactTopic = SUBJECTS[subjectId].topics.find(
    (topic) => normalizeText(topic) === normalizeText(requested)
  );

  return exactTopic || requested;
}

function buildQueries(subjectId: SubjectId, topic: string | null): string[] {
  const subjectTerms = SUBJECT_SEARCH_TERMS[subjectId] || [SUBJECTS[subjectId].name];
  const fallbackTopics = topic ? [topic] : SUBJECTS[subjectId].topics.slice(0, 3);
  const queries = new Set<string>();

  for (const subjectTerm of subjectTerms) {
    if (topic) {
      queries.add(`${subjectTerm} ${topic} #shorts`);
      queries.add(`${subjectTerm} ${topic} explained`);
      queries.add(`${subjectTerm} ${topic} lesson short`);
      queries.add(`${subjectTerm} ${topic} exam tips`);
    } else {
      queries.add(`${subjectTerm} #shorts`);
      queries.add(`${subjectTerm} past paper short lesson`);
      queries.add(`${subjectTerm} exam tutorial #shorts`);
      for (const fallbackTopic of fallbackTopics) {
        queries.add(`${subjectTerm} ${fallbackTopic} short lesson`);
      }
    }
  }

  return Array.from(queries);
}

function iso8601ToSeconds(duration: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration || "");
  if (!match) return 9999;

  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function formatViewCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "New";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${value}`;
}

function inferTopic(subjectId: SubjectId, title: string, description: string): string {
  const haystack = normalizeText(`${title} ${description}`);
  const topics = [...SUBJECTS[subjectId].topics].sort((left, right) => right.length - left.length);

  for (const topic of topics) {
    const normalizedTopic = normalizeText(topic);
    if (normalizedTopic && haystack.includes(normalizedTopic)) {
      return topic;
    }
  }

  return SUBJECTS[subjectId].topics[0] || "General";
}

function getThumbnail(video: YouTubeVideoItem): string {
  const thumbs = video.snippet?.thumbnails ?? {};
  return (
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url ||
    ""
  );
}

function buildSearchEmbedUrl(query: string): string {
  const encoded = encodeURIComponent(query.trim());
  return `https://www.youtube.com/embed?listType=search&list=${encoded}`;
}

function topicMatches(subjectId: SubjectId, topic: string | null, title: string, description: string): boolean {
  if (!topic) return true;

  const normalizedTopic = normalizeText(topic);
  if (!normalizedTopic) return true;

  const haystack = normalizeText(`${title} ${description}`);
  if (haystack.includes(normalizedTopic)) return true;

  // Also accept the inferred canonical topic for this subject.
  return normalizeText(inferTopic(subjectId, title, description)) === normalizedTopic;
}

async function fetchQueryVideos(params: {
  key: string;
  query: string;
  selectedTopic: string | null;
  subjectId: SubjectId;
  pageToken: string;
  usePageToken: boolean;
  enforceTopicMatch?: boolean;
}): Promise<QueryResult> {
  const { key, query, selectedTopic, subjectId, pageToken, usePageToken, enforceTopicMatch = true } = params;

  const searchURL = new URL(YT_SEARCH);
  searchURL.searchParams.set("key", key);
  searchURL.searchParams.set("part", "snippet");
  searchURL.searchParams.set("type", "video");
  searchURL.searchParams.set("q", query);
  searchURL.searchParams.set("maxResults", "25");
  searchURL.searchParams.set("videoDuration", "short");
  searchURL.searchParams.set("videoEmbeddable", "true");
  searchURL.searchParams.set("order", selectedTopic ? "relevance" : "date");
  searchURL.searchParams.set("safeSearch", "moderate");
  searchURL.searchParams.set("relevanceLanguage", "en");

  if (usePageToken && pageToken) {
    searchURL.searchParams.set("pageToken", pageToken);
  }

  const searchResponse = await fetch(searchURL.toString(), {
    // Cache short-lived results to speed repeated topic loads.
    next: { revalidate: 180 },
  });
  if (!searchResponse.ok) {
    let errorCode: string | null = null;
    let errorMessage: string | null = null;
    try {
      const errorPayload = await searchResponse.json();
      errorCode = errorPayload?.error?.status || null;
      errorMessage = errorPayload?.error?.message || null;
    } catch {
      errorMessage = `YouTube search request failed (${searchResponse.status}).`;
    }
    return { items: [], nextPageToken: null, errorCode, errorMessage };
  }

  const searchData = await searchResponse.json();
  const videoIds: string[] =
    searchData?.items?.map((item: { id?: { videoId?: string } }) => item?.id?.videoId).filter(Boolean) ?? [];

  if (!videoIds.length) {
    return { items: [], nextPageToken: searchData?.nextPageToken || null };
  }

  const videosURL = new URL(YT_VIDEOS);
  videosURL.searchParams.set("key", key);
  videosURL.searchParams.set("part", "contentDetails,snippet,statistics,status");
  videosURL.searchParams.set("id", videoIds.join(","));

  const videosResponse = await fetch(videosURL.toString(), {
    next: { revalidate: 180 },
  });
  if (!videosResponse.ok) {
    return {
      items: [],
      nextPageToken: searchData?.nextPageToken || null,
      errorCode: null,
      errorMessage: `YouTube videos request failed (${videosResponse.status}).`,
    };
  }

  const videosData = await videosResponse.json();
  const items: ReelItem[] = [];

  for (const video of (videosData?.items ?? []) as YouTubeVideoItem[]) {
    const videoId = video.id;
    const seconds = iso8601ToSeconds(video.contentDetails?.duration || "");
    if (!videoId || seconds <= 0 || seconds > MAX_REEL_DURATION_SECONDS) {
      continue;
    }

    if (video.status?.embeddable === false) {
      continue;
    }

    const title = video.snippet?.title?.trim() || "Untitled lesson";
    const description = (video.snippet?.description || "").replace(/\s+/g, " ").trim();

    if (enforceTopicMatch && !topicMatches(subjectId, selectedTopic, title, description)) {
      continue;
    }

    const topicLabel = selectedTopic || inferTopic(subjectId, title, description);
    const viewCount = parseInt(video.statistics?.viewCount || "0", 10);

    items.push({
      videoId,
      title,
      description,
      channelTitle: video.snippet?.channelTitle || "YouTube",
      publishedAt: video.snippet?.publishedAt || "",
      durationSec: seconds,
      durationLabel: formatDuration(seconds),
      thumbnail: getThumbnail(video),
      topic: topicLabel,
      viewCount,
      viewCountLabel: formatViewCount(viewCount),
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return {
    items,
    nextPageToken: searchData?.nextPageToken || null,
  };
}

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subjectId = normalizeSubjectId(searchParams.get("subject"));
  const pageToken = (searchParams.get("page_token") || "").trim();
  const maxItems = Math.min(Math.max(parseInt(searchParams.get("max_items") || "12", 10), 4), 24);

  if (!subjectId) {
    return NextResponse.json(
      { error: "Unsupported subject.", supported: Object.keys(SUBJECTS) },
      { status: 400 }
    );
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing YOUTUBE_API_KEY in environment." }, { status: 500 });
  }

  const selectedTopic = sanitizeTopic(subjectId, searchParams.get("topic"));
  const queries = buildQueries(subjectId, selectedTopic).slice(0, selectedTopic ? 4 : 6);
  const items: ReelItem[] = [];
  const seenVideoIds = new Set<string>();
  let nextPageToken: string | null = null;

  const queryResults = await Promise.allSettled(
    queries.map((query, index) =>
      fetchQueryVideos({
        key,
        query,
        selectedTopic,
        subjectId,
        pageToken,
        usePageToken: Boolean(pageToken && index === 0),
        enforceTopicMatch: true,
      })
    )
  );

  let upstreamError: { code: string | null; message: string | null } | null = null;

  for (const result of queryResults) {
    if (result.status !== "fulfilled") continue;

    if (!upstreamError && (result.value.errorCode || result.value.errorMessage)) {
      upstreamError = {
        code: result.value.errorCode || null,
        message: result.value.errorMessage || null,
      };
    }

    nextPageToken = nextPageToken || result.value.nextPageToken;
    for (const reel of result.value.items) {
      if (seenVideoIds.has(reel.videoId)) continue;

      seenVideoIds.add(reel.videoId);
      items.push(reel);
      if (items.length >= maxItems) break;
    }

    if (items.length >= maxItems) break;
  }

  if (!items.length && upstreamError?.code === "PERMISSION_DENIED") {
    return NextResponse.json(
      {
        error:
          "YouTube Data API is disabled or restricted for the current YOUTUBE_API_KEY. Enable youtube.googleapis.com for this key's Google Cloud project, then retry.",
        details: upstreamError.message,
      },
      { status: 503 }
    );
  }

  // Fallback pass 1: keep subject + topic query terms but relax strict topic match.
  if (!items.length && selectedTopic) {
    const relaxedResults = await Promise.allSettled(
      queries.slice(0, 4).map((query, index) =>
        fetchQueryVideos({
          key,
          query,
          selectedTopic,
          subjectId,
          pageToken,
          usePageToken: Boolean(pageToken && index === 0),
          enforceTopicMatch: false,
        })
      )
    );

    for (const result of relaxedResults) {
      if (result.status !== "fulfilled") continue;
      nextPageToken = nextPageToken || result.value.nextPageToken;
      for (const reel of result.value.items) {
        if (seenVideoIds.has(reel.videoId)) continue;
        seenVideoIds.add(reel.videoId);
        items.push(reel);
        if (items.length >= maxItems) break;
      }
      if (items.length >= maxItems) break;
    }
  }

  // Fallback pass 2: broad subject-level queries to avoid empty screens.
  if (!items.length) {
    const broadQueries = (SUBJECT_SEARCH_TERMS[subjectId] || [SUBJECTS[subjectId].name]).flatMap((term) => [
      `${term} lesson`,
      `${term} tutorial`,
      `${term} exam practice`,
      `${term} concept explained`,
    ]);

    const broadResults = await Promise.allSettled(
      broadQueries.slice(0, 4).map((query, index) =>
        fetchQueryVideos({
          key,
          query,
          selectedTopic: null,
          subjectId,
          pageToken,
          usePageToken: Boolean(pageToken && index === 0),
          enforceTopicMatch: false,
        })
      )
    );

    for (const result of broadResults) {
      if (result.status !== "fulfilled") continue;
      nextPageToken = nextPageToken || result.value.nextPageToken;
      for (const reel of result.value.items) {
        if (seenVideoIds.has(reel.videoId)) continue;
        seenVideoIds.add(reel.videoId);
        items.push(reel);
        if (items.length >= maxItems) break;
      }
      if (items.length >= maxItems) break;
    }
  }

  // Fallback pass 3: API-less query embeds so students still get playable YouTube content.
  if (!items.length) {
    const emergencyQueries = buildQueries(subjectId, selectedTopic).slice(0, 6);
    for (let index = 0; index < emergencyQueries.length; index += 1) {
      const query = emergencyQueries[index];
      const syntheticId = `search-${subjectId}-${index}`;

      items.push({
        videoId: syntheticId,
        title: `${selectedTopic || SUBJECTS[subjectId].name} study reel`,
        description: `Playing live YouTube search results for: ${query}`,
        channelTitle: "YouTube Search",
        publishedAt: "",
        durationSec: 90,
        durationLabel: "Live",
        thumbnail: "/placeholder.svg",
        topic: selectedTopic || SUBJECTS[subjectId].topics[0] || "General",
        viewCount: 0,
        viewCountLabel: "Live",
        embedUrl: buildSearchEmbedUrl(query),
        watchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      });

      if (items.length >= maxItems) break;
    }
  }

  const response = NextResponse.json({
    subject: subjectId,
    selectedTopic,
    availableTopics: SUBJECTS[subjectId].topics,
    items,
    nextPageToken,
  });

  response.headers.set("Cache-Control", "public, s-maxage=180, stale-while-revalidate=300");
  return response;
}
