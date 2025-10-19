// app/api/shorts/route.ts
import { NextResponse } from "next/server";

const YT_SEARCH = "https://www.googleapis.com/youtube/v3/search";
const YT_VIDEOS = "https://www.googleapis.com/youtube/v3/videos";

// Map your subject IDs → query “themes” we’ll search for on YouTube
// (You can extend/tune this anytime.)
const SUBJECT_QUERY: Record<string, string[]> = {
  "csec-math": [
    "CSEC Mathematics #shorts",
    "CSEC Math past paper #shorts",
  ],
  "csec-chem": [
    "CSEC Chemistry #shorts",
    "CSEC Chem past paper #shorts",
  ],
  "csec-eng": [
    "CSEC English Language #shorts",
    "CSEC English past paper #shorts",
  ],
  "cape-puremaths": [
    "CAPE Pure Mathematics #shorts",
    "CAPE Pure Math past paper #shorts",
  ],
  "cape-bio": [
    "CAPE Biology #shorts",
    "CAPE Bio past paper #shorts",
  ],
  "cape-phys": [
    "CAPE Physics #shorts",
    "CAPE Physics past paper #shorts",
  ],
};

function iso8601ToSeconds(dur: string): number {
  // PT#M#S
  const m = /^PT(?:(\d+)M)?(?:(\d+)S)?$/.exec(dur);
  if (!m) return 9999;
  const min = parseInt(m[1] ?? "0", 10);
  const sec = parseInt(m[2] ?? "0", 10);
  return min * 60 + sec;
}

// Normalize to a shape that’s easy to render in your existing UI
type ReelItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  durationSec: number;
  thumbnail: string;
};

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subjectId = (searchParams.get("subject") || "").trim();
  const pageToken = (searchParams.get("page_token") || "").trim();
  const maxItems = Math.min(Math.max(parseInt(searchParams.get("max_items") || "20", 10), 5), 50);

  if (!subjectId || !(subjectId in SUBJECT_QUERY)) {
    return NextResponse.json(
      { error: `Unsupported subject '${subjectId}'.`, supported: Object.keys(SUBJECT_QUERY) },
      { status: 400 }
    );
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing YOUTUBE_API_KEY in environment." }, { status: 500 });
  }

  // Try queries in order until we gather enough ≤ 60s videos
  const queries = SUBJECT_QUERY[subjectId];
  const items: ReelItem[] = [];
  let nextPageToken: string | null = null;

  for (const q of queries) {
    if (items.length >= maxItems) break;

    const searchURL = new URL(YT_SEARCH);
    searchURL.searchParams.set("key", key);
    searchURL.searchParams.set("part", "snippet");
    searchURL.searchParams.set("type", "video");
    searchURL.searchParams.set("q", q);
    searchURL.searchParams.set("maxResults", "25");
    searchURL.searchParams.set("videoDuration", "short"); // <4 minutes (YouTube granularity)
    searchURL.searchParams.set("order", "relevance");
    searchURL.searchParams.set("safeSearch", "moderate");
    if (pageToken && items.length === 0) {
      // only attach the external page_token to the first query
      searchURL.searchParams.set("pageToken", pageToken);
    }

    const sRes = await fetch(searchURL.toString());
    if (!sRes.ok) continue;
    const sData = await sRes.json();
    nextPageToken = sData?.nextPageToken ?? null;

    const videoIds: string[] =
      sData?.items?.map((it: any) => it?.id?.videoId).filter(Boolean) ?? [];
    if (!videoIds.length) continue;

    const vURL = new URL(YT_VIDEOS);
    vURL.searchParams.set("key", key);
    vURL.searchParams.set("part", "contentDetails,snippet,statistics");
    vURL.searchParams.set("id", videoIds.join(","));
    vURL.searchParams.set("maxResults", "50");

    const vRes = await fetch(vURL.toString());
    if (!vRes.ok) continue;
    const vData = await vRes.json();
    for (const v of vData?.items ?? []) {
      const dur = v?.contentDetails?.duration as string;
      const seconds = iso8601ToSeconds(dur);
      if (seconds > 60) continue; // keep it truly "Shorts"-length

      const snip = v.snippet;
      const thumbs = snip?.thumbnails ?? {};
      const thumb =
        thumbs?.maxres?.url ||
        thumbs?.high?.url ||
        thumbs?.medium?.url ||
        thumbs?.default?.url ||
        "";

      items.push({
        videoId: v.id,
        title: snip?.title ?? "",
        channelTitle: snip?.channelTitle ?? "",
        publishedAt: snip?.publishedAt ?? "",
        durationSec: seconds,
        thumbnail: thumb,
      });

      if (items.length >= maxItems) break;
    }
  }

  return NextResponse.json({
    subject: subjectId,
    items,
    nextPageToken,
  });
}
