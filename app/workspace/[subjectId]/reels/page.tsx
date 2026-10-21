"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects"
import {
  Video,
  ArrowLeft,
  Play,
  Volume2,
  VolumeX,
  Bookmark,
  Share2,
  ThumbsUp,
  ChevronUp,
  ChevronDown,
  Clock,
} from "lucide-react"
import { SapphyFab } from "@/components/sapphy-fab"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import { hasAuthToken, resolveBackendSubject, fetchBackendTopics, type BackendTopic } from "@/lib/services/backend-subject-map"

type ReelItem = {
  id: number // backend reel id: used for view/like/save
  videoId: string
  title: string
  description: string
  channelTitle: string
  publishedAt: string
  durationSec: number
  durationLabel: string
  thumbnail: string
  topic: string | null
  youtubeViewCount: number
  likeCount: number
  embedUrl: string
  watchUrl: string
  // Backend-provided toggle state (present when reels come from the authenticated backend)
  isLiked?: boolean
  isSaved?: boolean
}

function formatCount(n: number): string {
  if (!n) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

const SUBJECT_ALIASES: Record<string, SubjectId> = {
  "1": "csec-math",
  "2": "csec-eng",
  "3": "csec-chem",
  "4": "cape-phys",
  "5": "cape-bio",
  "6": "cape-puremath",
  "csec-1": "csec-math",
  "csec-2": "csec-chem",
  "csec-3": "csec-eng",
  "cape-1": "cape-puremath",
  "cape-2": "cape-phys",
  "cape-3": "cape-bio",
  "csec-english": "csec-eng",
  "csec-chemistry": "csec-chem",
  "cape-puremaths": "cape-puremath",
  "cape-physics": "cape-phys",
  "cape-biology": "cape-bio",
}

const ALL_TOPICS = "All topics"

function normalizeSubjectId(id: string): SubjectId {
  const normalized = String(id || "").trim().toLowerCase()
  return (SUBJECT_ALIASES[normalized] || normalized || "csec-math") as SubjectId
}

function withPlayerParams(baseUrl: string, options: { muted: boolean; videoId: string }) {
  const separator = baseUrl.includes("?") ? "&" : "?"
  const common = `autoplay=1&mute=${options.muted ? 1 : 0}&controls=1&rel=0&modestbranding=1&playsinline=1`

  // YouTube search playlist embeds do not support forcing synthetic playlist IDs.
  if (baseUrl.includes("listType=search")) {
    return `${baseUrl}${separator}${common}`
  }

  return `${baseUrl}${separator}${common}&loop=1&playlist=${options.videoId}`
}

export default function ReelsPage() {
  const params = useParams()
  const router = useRouter()
  const rawSubjectId = params.subjectId as string
  const subjectId = useMemo(() => normalizeSubjectId(rawSubjectId), [rawSubjectId])
  const subject = SUBJECTS[subjectId]

  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS)
  const [reels, setReels] = useState<ReelItem[]>([])
  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableTopics, setAvailableTopics] = useState<string[]>(subject.topics)
  const [likedReels, setLikedReels] = useState<Set<number>>(new Set())
  const [savedReels, setSavedReels] = useState<Set<number>>(new Set())
  const [backendSubjectId, setBackendSubjectId] = useState<number | null>(null)
  const [backendTopics, setBackendTopics] = useState<BackendTopic[]>([])
  const [topicFallback, setTopicFallback] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [showSaved, setShowSaved] = useState(false)
  const viewedReels = useRef<Set<number>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    if (rawSubjectId && rawSubjectId !== subjectId) {
      router.replace(`/workspace/${subjectId}/reels`)
    }
  }, [rawSubjectId, subjectId, router])

  useEffect(() => {
    setSelectedTopic(ALL_TOPICS)
    setAvailableTopics(subject.topics)
    setCurrentReelIndex(0)
    setIsPlaying(true)
    setBackendSubjectId(null)
    setBackendTopics([])
    setReels([])
  }, [subjectId])

  // Backend subject + topics (topic filter needs integer ids)
  useEffect(() => {
    let cancelled = false
    if (!hasAuthToken()) return
    resolveBackendSubject(subjectId)
      .then(async (bs) => {
        const topics = await fetchBackendTopics(bs.subjectId)
        if (cancelled) return
        setBackendSubjectId(bs.subjectId)
        setBackendTopics(topics)
        setAvailableTopics(topics.length ? topics.map((t) => t.name) : subject.topics)
      })
      .catch((e: any) => {
        if (cancelled) return
        setIsLoading(false)
        setError(e?.message || "Failed to load study reels.")
      })
    return () => {
      cancelled = true
    }
  }, [subjectId])

  useEffect(() => {
    if (!hasAuthToken()) {
      setIsLoading(false)
      setReels([])
      setError("Study reels need a Sapphire account. Please sign in with a registered account.")
      return
    }
    if (backendSubjectId == null && !showSaved) return
    let cancelled = false

    async function loadReels() {
      setIsLoading(true)
      setError(null)
      setTopicFallback(false)
      setPage(1)

      try {
        const topic = backendTopics.find((t) => t.name === selectedTopic)
        const response: any = showSaved
          ? await apiClient.get(`/api/reels/saved`)
          : await apiClient.get(`/api/subject/${backendSubjectId}/reels`, {
              topicId: selectedTopic !== ALL_TOPICS ? topic?.id : undefined,
              limit: 18,
              page: 1,
            })
        if (cancelled) return

        const data = response?.data || response
        const items: ReelItem[] = Array.isArray(data?.reels) ? data.reels : []
        setReels(items)
        setHasMore(!showSaved && !!data?.hasMore)
        setTopicFallback(!showSaved && !!data?.topicFallback)
        setCurrentReelIndex(0)
        setIsPlaying(items.length > 0)
        setLikedReels(new Set(items.filter((r) => r.isLiked).map((r) => r.id)))
        setSavedReels(new Set(items.filter((r) => r.isSaved).map((r) => r.id)))

        if (!items.length && !showSaved) setError("No videos matched this subject right now. Try again in a moment.")
      } catch (loadError: unknown) {
        if (cancelled) return
        setReels([])
        setError(loadError instanceof Error ? loadError.message : "Failed to load study reels.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadReels()
    return () => {
      cancelled = true
    }
  }, [backendSubjectId, backendTopics, selectedTopic, reloadKey, showSaved])

  const loadMore = async () => {
    if (backendSubjectId == null || loadingMore) return
    setLoadingMore(true)
    try {
      const topic = backendTopics.find((t) => t.name === selectedTopic)
      const next = page + 1
      const response: any = await apiClient.get(`/api/subject/${backendSubjectId}/reels`, {
        topicId: selectedTopic !== ALL_TOPICS ? topic?.id : undefined,
        limit: 18,
        page: next,
      })
      const data = response?.data || response
      const items: ReelItem[] = Array.isArray(data?.reels) ? data.reels : []
      setReels((prev) => [...prev, ...items.filter((i) => !prev.some((p) => p.id === i.id))])
      setLikedReels((prev) => new Set([...prev, ...items.filter((r) => r.isLiked).map((r) => r.id)]))
      setSavedReels((prev) => new Set([...prev, ...items.filter((r) => r.isSaved).map((r) => r.id)]))
      setPage(next)
      setHasMore(!!data?.hasMore)
    } catch (e: any) {
      toast({ title: "Couldn't load more reels", description: e?.message, variant: "destructive" })
    } finally {
      setLoadingMore(false)
    }
  }

  const currentReel = reels[currentReelIndex] || null
  const isLiked = currentReel ? likedReels.has(currentReel.id) : false
  const isSaved = currentReel ? savedReels.has(currentReel.id) : false

  // Count a view once per reel, when it starts playing (feeds streaks, study time and admin analytics)
  useEffect(() => {
    if (!currentReel || !isPlaying || !hasAuthToken()) return
    if (viewedReels.current.has(currentReel.id)) return
    viewedReels.current.add(currentReel.id)
    apiClient.post(`/api/reels/${currentReel.id}/view`).catch(() => viewedReels.current.delete(currentReel.id))
  }, [currentReel?.id, isPlaying])

  const handleNext = () => {
    setCurrentReelIndex((index) => {
      const nextIndex = Math.min(index + 1, Math.max(reels.length - 1, 0))
      if (nextIndex !== index) {
        setIsPlaying(true)
      }
      return nextIndex
    })
  }

  const handlePrevious = () => {
    setCurrentReelIndex((index) => {
      const previousIndex = Math.max(index - 1, 0)
      if (previousIndex !== index) {
        setIsPlaying(true)
      }
      return previousIndex
    })
  }

  const handleLike = async () => {
    if (!currentReel) return
    const wasLiked = likedReels.has(currentReel.id)
    // Optimistic update
    setLikedReels((previous) => {
      const next = new Set(previous)
      if (next.has(currentReel.id)) next.delete(currentReel.id)
      else next.add(currentReel.id)
      return next
    })
    if (hasAuthToken()) {
      try {
        await apiClient.post(`/api/reels/${currentReel.id}/like`)
      } catch (e: any) {
        // Revert optimistic update on error
        setLikedReels((previous) => {
          const next = new Set(previous)
          if (wasLiked) next.add(currentReel.id)
          else next.delete(currentReel.id)
          return next
        })
        if (e.status === 404) {
          toast({ title: "Reel not found", description: "This reel is no longer available.", variant: "destructive" })
        }
      }
    }
  }

  const handleSave = async () => {
    if (!currentReel) return
    const wasSaved = savedReels.has(currentReel.id)
    // Optimistic update
    setSavedReels((previous) => {
      const next = new Set(previous)
      if (next.has(currentReel.id)) next.delete(currentReel.id)
      else next.add(currentReel.id)
      return next
    })
    if (hasAuthToken()) {
      try {
        await apiClient.post(`/api/reels/${currentReel.id}/save`)
        if (showSaved && wasSaved) {
          const removedId = currentReel.id
          setReels((prev) => prev.filter((r) => r.id !== removedId))
          setCurrentReelIndex((i) => Math.max(0, Math.min(i, reels.length - 2)))
        }
      } catch (e: any) {
        // Revert optimistic update on error
        setSavedReels((previous) => {
          const next = new Set(previous)
          if (wasSaved) next.add(currentReel.id)
          else next.delete(currentReel.id)
          return next
        })
        if (e.status === 404) {
          toast({ title: "Reel not found", description: "This reel is no longer available.", variant: "destructive" })
        }
      }
    }
  }

  const handleShare = async () => {
    if (!currentReel) return

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: currentReel.title,
          text: `Study reel for ${subject.name}: ${currentReel.topic || "General"}`,
          url: currentReel.watchUrl,
        })
        return
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(currentReel.watchUrl)
      }
    } catch {
      return
    }
  }

  const handleBack = () => {
    router.back()
  }

  if (!subject) {
    return <div className="p-6">Unknown subject.</div>
  }

  const topicButtons = [ALL_TOPICS, ...availableTopics]

  const roundBtn =
    "size-12 rounded-full bg-black/50 text-white shadow-none backdrop-blur-sm hover:bg-black/70 hover:text-white"

  return (
    <div className="min-h-screen bg-background">
      <SapphyFab activity="reels" subjectId={subjectId} startOpen={false} />
      <header className="hdr">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack} className="min-h-11 rounded-lg shadow-none">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {subject.name}
            </Button>
            <span className="h-6 w-px bg-border" />
            <span className="g-reels inline-flex size-8 items-center justify-center rounded-lg text-white" aria-hidden="true">
              <Video className="size-4" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-[22px]">Study reels</h1>
              <p className="text-xs text-muted-foreground">Short videos picked for your subject</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-7 px-6 pb-16 pt-7">
        <section className="flex min-w-0 flex-[999_1_420px] flex-col items-center gap-4">
          <div className="relative aspect-[9/16] w-full max-w-[380px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#12306f] to-[#08142e] shadow-lg">
            {currentReel && isPlaying ? (
              <iframe
                key={`${currentReel.videoId}-${isMuted ? "muted" : "sound"}`}
                src={withPlayerParams(currentReel.embedUrl, { muted: isMuted, videoId: currentReel.videoId })}
                title={currentReel.title}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : currentReel ? (
              <img
                src={currentReel.thumbnail || "/placeholder.svg"}
                alt={currentReel.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}

            {!currentReel && !isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-6 text-center">
                <div>
                  <p className="font-semibold text-white">No reels available</p>
                  <p className="mt-2 text-sm text-white/70">Select another topic to pull a different set of YouTube videos.</p>
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-6 text-center">
                <div>
                  <p className="font-semibold text-white">Loading reels</p>
                  <p className="mt-2 text-sm text-white/70">
                    Fetching YouTube videos for {selectedTopic === ALL_TOPICS ? subject.name : selectedTopic}.
                  </p>
                </div>
              </div>
            ) : null}

            {currentReel ? (
              <>
                {!isPlaying ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                    <Button
                      onClick={() => setIsPlaying(true)}
                      aria-label="Play"
                      className="pointer-events-auto size-[72px] rounded-full bg-white/90 text-[#08142e] shadow-none hover:bg-white"
                    >
                      <Play className="ml-1 size-8" />
                    </Button>
                  </div>
                ) : null}

                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-xs font-medium text-white">
                  <Clock className="size-3" />
                  {currentReel.durationLabel}
                </span>

                <div className="absolute bottom-[120px] right-3 flex flex-col gap-3">
                  <Button variant="ghost" onClick={handleLike} aria-label="Like" aria-pressed={isLiked} className={cn(roundBtn, isLiked && "text-red-400")}>
                    <ThumbsUp className={cn("size-5", isLiked && "fill-current")} />
                  </Button>
                  <Button variant="ghost" onClick={handleSave} aria-label="Saved" aria-pressed={isSaved} className={cn(roundBtn, isSaved && "text-accent hover:text-accent")}>
                    <Bookmark className={cn("size-5", isSaved && "fill-current")} />
                  </Button>
                  <Button variant="ghost" onClick={handleShare} aria-label="Share" className={roundBtn}>
                    <Share2 className="size-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsMuted((value) => !value)
                      if (!isPlaying) setIsPlaying(true)
                    }}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    className={roundBtn}
                  >
                    {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                  </Button>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 to-transparent p-5 text-white">
                  <Badge className="w-fit">{currentReel.topic || subject.name}</Badge>
                  <p className="text-lg font-bold leading-6">{currentReel.title}</p>
                  <p className="text-xs text-white/80">
                    {currentReel.channelTitle} · {formatCount(currentReel.youtubeViewCount)} views
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handlePrevious} disabled={currentReelIndex === 0} aria-label="Previous reel" className="size-11 rounded-full shadow-none">
              <ChevronUp className="size-5" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {reels.length ? `${currentReelIndex + 1} of ${reels.length}` : "No reels loaded"}
            </span>
            <Button variant="outline" size="icon" onClick={handleNext} disabled={currentReelIndex === reels.length - 1} aria-label="Next reel" className="size-11 rounded-full shadow-none">
              <ChevronDown className="size-5" />
            </Button>
          </div>
        </section>

        <aside className="flex max-w-[420px] flex-[1_1_340px] flex-col gap-4">
          <Card className="gap-3.5 rounded-2xl p-4">
            <div className="flex gap-0.5 rounded-xl bg-muted p-[3px]">
              <button
                onClick={() => setShowSaved(false)}
                aria-pressed={!showSaved}
                className={cn("min-h-11 flex-1 rounded-lg text-sm font-medium text-muted-foreground", !showSaved && "bg-card text-foreground shadow-xs")}
              >
                All reels
              </button>
              <button
                onClick={() => setShowSaved(true)}
                aria-pressed={showSaved}
                className={cn("flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground", showSaved && "bg-card text-foreground shadow-xs")}
              >
                <Bookmark className="size-3.5" />
                Saved
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topicButtons.map((topic) => (
                <Button
                  key={topic}
                  variant={selectedTopic === topic ? "default" : "outline"}
                  size="sm"
                  className="min-h-11 rounded-full shadow-none"
                  disabled={showSaved}
                  onClick={() => setSelectedTopic(topic)}
                >
                  {topic}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden rounded-2xl py-0">
            <div className="flex items-center justify-between border-b px-4 py-3.5">
              <h2 className="text-base font-semibold">{showSaved ? "Saved reels" : "Up next"}</h2>
              <span className="text-xs text-muted-foreground">{selectedTopic === ALL_TOPICS ? subject.name : selectedTopic}</span>
            </div>
            {topicFallback ? (
              <p className="px-4 pt-3 text-xs text-muted-foreground">No videos for this topic yet, showing all topics.</p>
            ) : null}
            <ScrollArea className="h-[500px]">
              <div className="flex flex-col gap-1 p-2">
                {reels.map((reel, index) => (
                  <button
                    key={reel.id}
                    onClick={() => {
                      setCurrentReelIndex(index)
                      setIsPlaying(true)
                    }}
                    className={cn(
                      "flex gap-3 rounded-xl border-2 p-2 text-left",
                      index === currentReelIndex ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60",
                    )}
                  >
                    <span className="relative inline-flex h-[76px] w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-navy to-[#061436] text-white">
                      <img src={reel.thumbnail || "/placeholder.svg"} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <Play className="relative size-5 drop-shadow-lg" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="line-clamp-2 text-[13px] font-semibold leading-[18px]">{reel.title}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {reel.durationLabel} · {reel.topic || subject.name}
                      </span>
                    </span>
                  </button>
                ))}
                {hasMore ? (
                  <Button variant="ghost" size="sm" className="min-h-11 w-full shadow-none" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Load more"}
                  </Button>
                ) : null}
                {!reels.length && !isLoading ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    {showSaved
                      ? "You haven't saved any reels yet. Tap the bookmark on a reel to keep it here."
                      : "No reels matched this filter. Try a different topic or go back to all topics."}
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </Card>

          {error ? (
            <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-[13px] text-destructive">
              <span>{error}</span>
              {hasAuthToken() ? (
                <Button size="sm" variant="outline" className="ml-auto min-h-11 shadow-none" onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  )
}
