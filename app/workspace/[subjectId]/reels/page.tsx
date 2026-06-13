"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects"
import {
  Sparkles,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Bookmark,
  Share2,
  ThumbsUp,
  ChevronUp,
  ChevronDown,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import { hasAuthToken } from "@/lib/services/backend-subject-map"

type ReelItem = {
  videoId: string
  title: string
  description: string
  channelTitle: string
  publishedAt: string
  durationSec: number
  durationLabel: string
  thumbnail: string
  topic: string
  viewCount: number
  viewCountLabel: string
  embedUrl: string
  watchUrl: string
  // Backend-provided toggle state (present when reels come from the authenticated backend)
  isLiked?: boolean
  isSaved?: boolean
}

const SUBJECT_ICONS: Record<SubjectId, string> = {
  "csec-math": "📐",
  "csec-chem": "🧪",
  "csec-eng": "📚",
  "cape-puremath": "📈",
  "cape-phys": "⚡",
  "cape-bio": "🧬",
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

function formatPublishedDate(value: string): string {
  if (!value) return "Recent upload"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recent upload"
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function buildReelDetails(reel: ReelItem): string[] {
  const details = [
    `Topic focus: ${reel.topic}`,
    `Channel: ${reel.channelTitle}`,
    `Published: ${formatPublishedDate(reel.publishedAt)}`,
    `Views: ${reel.viewCountLabel}`,
  ]

  if (reel.description) {
    details.unshift(reel.description)
  }

  return details
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
  const subjectIcon = SUBJECT_ICONS[subjectId] || "📚"

  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS)
  const [reels, setReels] = useState<ReelItem[]>([])
  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableTopics, setAvailableTopics] = useState<string[]>(subject.topics)
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set())
  const [savedReels, setSavedReels] = useState<Set<string>>(new Set())
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
  }, [subjectId])

  useEffect(() => {
    const controller = new AbortController()

    async function loadReels() {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams({
          subject: subjectId,
          max_items: "18",
          _ts: Date.now().toString(),
        })

        if (selectedTopic !== ALL_TOPICS) {
          searchParams.set("topic", selectedTopic)
        }

        const response = await fetch(`/api/shorts?${searchParams.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load study reels.")
        }

        const items: ReelItem[] = Array.isArray(payload.items) ? payload.items : []
        const topicOptions = Array.isArray(payload.availableTopics) ? payload.availableTopics : subject.topics
        setAvailableTopics(topicOptions)
        setReels(items)
        setCurrentReelIndex(0)
        setIsPlaying(items.length > 0)

        // Initialise liked/saved state from backend-provided booleans
        setLikedReels(new Set(items.filter(r => r.isLiked).map(r => r.videoId)))
        setSavedReels(new Set(items.filter(r => r.isSaved).map(r => r.videoId)))

        if (!items.length) {
          if (selectedTopic !== ALL_TOPICS) {
            setError(`No videos for ${selectedTopic} yet. Switching to all topics...`)
            setSelectedTopic(ALL_TOPICS)
            return
          }

          setError("No videos matched this subject right now. Try again in a moment.")
        }
      } catch (loadError: unknown) {
        if ((loadError as Error).name === "AbortError") {
          return
        }

        setReels([])
        setError(loadError instanceof Error ? loadError.message : "Failed to load study reels.")
      } finally {
        setIsLoading(false)
      }
    }

    loadReels()
    return () => controller.abort()
  }, [subjectId, selectedTopic])

  const currentReel = reels[currentReelIndex] || null
  const currentReelDetails = currentReel ? buildReelDetails(currentReel) : []
  const isLiked = currentReel ? likedReels.has(currentReel.videoId) : false
  const isSaved = currentReel ? savedReels.has(currentReel.videoId) : false

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
    const wasLiked = likedReels.has(currentReel.videoId)
    // Optimistic update
    setLikedReels((previous) => {
      const next = new Set(previous)
      if (next.has(currentReel.videoId)) next.delete(currentReel.videoId)
      else next.add(currentReel.videoId)
      return next
    })
    if (hasAuthToken()) {
      try {
        await apiClient.post(`/api/reels/${currentReel.videoId}/like`)
      } catch (e: any) {
        // Revert optimistic update on error
        setLikedReels((previous) => {
          const next = new Set(previous)
          if (wasLiked) next.add(currentReel.videoId)
          else next.delete(currentReel.videoId)
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
    const wasSaved = savedReels.has(currentReel.videoId)
    // Optimistic update
    setSavedReels((previous) => {
      const next = new Set(previous)
      if (next.has(currentReel.videoId)) next.delete(currentReel.videoId)
      else next.add(currentReel.videoId)
      return next
    })
    if (hasAuthToken()) {
      try {
        await apiClient.post(`/api/reels/${currentReel.videoId}/save`)
      } catch (e: any) {
        // Revert optimistic update on error
        setSavedReels((previous) => {
          const next = new Set(previous)
          if (wasSaved) next.add(currentReel.videoId)
          else next.delete(currentReel.videoId)
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
          text: `Study reel for ${subject.name}: ${currentReel.topic}`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-2xl">{subjectIcon}</span>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">{subject.name} Reels</h1>
                  <p className="text-xs text-muted-foreground">Quick study videos streamed from YouTube</p>
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            <div className="space-y-4">
              <Card className="border-2 shadow-2xl overflow-hidden bg-black">
                <div className="relative aspect-[9/16] max-h-[600px] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
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
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}

                  {!currentReel && !isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-6 text-center">
                      <div>
                        <p className="text-white font-semibold">No reels available</p>
                        <p className="text-sm text-white/70 mt-2">Select another topic to pull a different set of YouTube videos.</p>
                      </div>
                    </div>
                  ) : null}

                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-6 text-center">
                      <div>
                        <p className="text-white font-semibold">Loading reels</p>
                        <p className="text-sm text-white/70 mt-2">Fetching YouTube videos for {selectedTopic === ALL_TOPICS ? subject.name : selectedTopic}.</p>
                      </div>
                    </div>
                  ) : null}

                  {currentReel ? (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        {!isPlaying ? (
                          <Button
                            size="lg"
                            onClick={() => setIsPlaying(true)}
                            className="pointer-events-auto w-16 h-16 rounded-full bg-white/90 hover:bg-white text-black shadow-2xl"
                          >
                            <Play className="w-8 h-8 ml-1" />
                          </Button>
                        ) : null}
                      </div>

                      <div className="absolute top-4 left-4">
                        <Badge className="bg-black/70 text-white border-0">
                          <Clock className="w-3 h-3 mr-1" />
                          {currentReel.durationLabel}
                        </Badge>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                        <Badge className="mb-2">{currentReel.topic}</Badge>
                        <h2 className="text-xl font-bold text-white mb-2">{currentReel.title}</h2>
                        <p className="text-sm text-white/80">{currentReel.description || `${currentReel.channelTitle} • ${formatPublishedDate(currentReel.publishedAt)}`}</p>
                      </div>

                      <div className="absolute right-4 bottom-20 flex flex-col gap-4">
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={handleLike}
                          className={`w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-1 ${
                            isLiked ? "text-red-500" : "text-white"
                          }`}
                        >
                          <ThumbsUp className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`} />
                          <span className="text-xs">{currentReel.viewCountLabel}</span>
                        </Button>
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={handleSave}
                          className={`w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm ${
                            isSaved ? "text-yellow-500" : "text-white"
                          }`}
                        >
                          <Bookmark className={`w-6 h-6 ${isSaved ? "fill-current" : ""}`} />
                        </Button>
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={handleShare}
                          className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white"
                        >
                          <Share2 className="w-6 h-6" />
                        </Button>
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={() => {
                            setIsMuted((value) => !value)
                            if (!isPlaying) {
                              setIsPlaying(true)
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white"
                        >
                          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                        </Button>
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={() => setIsPlaying((value) => !value)}
                          className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white"
                        >
                          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </Button>
                      </div>

                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handlePrevious}
                          disabled={currentReelIndex === 0}
                          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white disabled:opacity-30"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleNext}
                          disabled={currentReelIndex === reels.length - 1}
                          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white disabled:opacity-30"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </Card>

              <Card className="border-2">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Reel Details</h3>
                  {currentReel ? (
                    <ul className="space-y-2">
                      {currentReelDetails.map((detail, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{index + 1}</span>
                          </div>
                          <span className="text-muted-foreground">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Choose a reel to see its details.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:sticky lg:top-24 h-fit space-y-4">
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Filter Topics</h3>
                      <p className="text-xs text-muted-foreground">Pull reels for the exact topic you want.</p>
                    </div>
                    <Badge variant="secondary">{subject.topics.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topicButtons.map((topic) => (
                      <Button
                        key={topic}
                        variant={selectedTopic === topic ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSelectedTopic(topic)}
                      >
                        {topic}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-foreground">All Reels</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reels.length ? `${currentReelIndex + 1} of ${reels.length}` : "No reels loaded"}
                  </p>
                  {error ? <p className="text-xs text-destructive mt-2">{error}</p> : null}
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-3">
                    {reels.map((reel, index) => (
                      <Card
                        key={reel.videoId}
                        onClick={() => {
                          setCurrentReelIndex(index)
                          setIsPlaying(true)
                        }}
                        className={`cursor-pointer transition-all duration-200 ${
                          index === currentReelIndex
                            ? "border-2 border-primary shadow-lg"
                            : "border hover:border-primary/50"
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/20 to-secondary/20">
                              <img
                                src={reel.thumbnail || "/placeholder.svg"}
                                alt={reel.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white drop-shadow-lg" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <Badge className="mb-1 text-xs">{reel.topic}</Badge>
                              <h4 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">{reel.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{reel.durationLabel}</span>
                                <span>•</span>
                                <span>{reel.viewCountLabel} views</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{reel.channelTitle}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {!reels.length && !isLoading ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No reels matched this filter. Try a different topic or go back to all topics.
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}



