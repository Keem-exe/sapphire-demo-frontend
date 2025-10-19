"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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

// Mock subject data
const SUBJECTS: Record<string, { name: string; icon: string }> = {
  "csec-math": { name: "Mathematics", icon: "📐" },
  "csec-english": { name: "English A", icon: "📚" },
  "csec-chemistry": { name: "Chemistry", icon: "🧪" },
  "cape-puremath": { name: "Pure Mathematics", icon: "📐" },
  "cape-physics": { name: "Physics", icon: "⚡" },
  "cape-biology": { name: "Biology", icon: "🧬" },
}

// Mock reels data
const MOCK_REELS = {
  "csec-math": [
    {
      id: 1,
      title: "Pythagorean Theorem Explained",
      description: "Quick visual proof of a² + b² = c² with real-world examples",
      duration: "45s",
      thumbnail: "/pythagorean-theorem-diagram.jpg",
      category: "Geometry",
      likes: 234,
      views: 1200,
      keyPoints: ["Right triangle basics", "Formula derivation", "Practice problems"],
    },
    {
      id: 2,
      title: "Solving Quadratic Equations",
      description: "Master the quadratic formula in under a minute",
      duration: "52s",
      thumbnail: "/quadratic-formula-math.jpg",
      category: "Algebra",
      likes: 189,
      views: 980,
      keyPoints: ["Identify a, b, c values", "Apply the formula", "Simplify solutions"],
    },
    {
      id: 3,
      title: "Circle Area Formula",
      description: "Why πr² works - visual explanation",
      duration: "38s",
      thumbnail: "/circle-area-formula.jpg",
      category: "Geometry",
      likes: 156,
      views: 850,
      keyPoints: ["Understanding π", "Radius vs diameter", "Quick calculations"],
    },
    {
      id: 4,
      title: "Linear Equations Basics",
      description: "Slope-intercept form made simple",
      duration: "48s",
      thumbnail: "/linear-equation-graph.png",
      category: "Algebra",
      likes: 201,
      views: 1050,
      keyPoints: ["What is slope?", "Y-intercept meaning", "Graphing tips"],
    },
  ],
  "csec-chemistry": [
    {
      id: 1,
      title: "Atomic Structure 101",
      description: "Protons, neutrons, and electrons explained",
      duration: "55s",
      thumbnail: "/atom-structure-diagram.jpg",
      category: "Atomic Structure",
      likes: 312,
      views: 1500,
      keyPoints: ["Subatomic particles", "Electron shells", "Atomic number"],
    },
    {
      id: 2,
      title: "pH Scale Simplified",
      description: "Understanding acids and bases in 60 seconds",
      duration: "58s",
      thumbnail: "/ph-scale-chemistry.jpg",
      category: "Acids and Bases",
      likes: 267,
      views: 1300,
      keyPoints: ["pH range 0-14", "Acids vs bases", "Neutral solutions"],
    },
    {
      id: 3,
      title: "Chemical Bonding Basics",
      description: "Ionic vs covalent bonds made easy",
      duration: "50s",
      thumbnail: "/chemical-bonds-diagram.jpg",
      category: "Bonding",
      likes: 198,
      views: 920,
      keyPoints: ["Electron transfer", "Electron sharing", "Bond types"],
    },
  ],
}

 // ✅ Normalize route-based subject IDs
  const normalizeSubjectId = (id: string): string => {
    const map: Record<string, string> = {
      "csec-1": "csec-math",
      "csec-2": "csec-chem",
      "csec-3": "csec-eng",
      "cape-1": "cape-puremath",
      "cape-2": "cape-phys",
      "cape-3": "cape-bio",
    }
    return map[id] || id
  }

export default function ReelsPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string
  const subject = SUBJECTS[normalizeSubjectId(subjectId)] || { name: "Unknown", icon: "📚" }

  const reels = MOCK_REELS[subjectId as keyof typeof MOCK_REELS] || MOCK_REELS["csec-math"]

  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [likedReels, setLikedReels] = useState<Set<number>>(new Set())
  const [savedReels, setSavedReels] = useState<Set<number>>(new Set())

  const currentReel = reels[currentReelIndex]

  const handleNext = () => {
    if (currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(currentReelIndex + 1)
      setIsPlaying(false)
    }
  }

  const handlePrevious = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(currentReelIndex - 1)
      setIsPlaying(false)
    }
  }

  const handleLike = () => {
    const newLiked = new Set(likedReels)
    if (newLiked.has(currentReel.id)) {
      newLiked.delete(currentReel.id)
    } else {
      newLiked.add(currentReel.id)
    }
    setLikedReels(newLiked)
  }

  const handleSave = () => {
    const newSaved = new Set(savedReels)
    if (newSaved.has(currentReel.id)) {
      newSaved.delete(currentReel.id)
    } else {
      newSaved.add(currentReel.id)
    }
    setSavedReels(newSaved)
  }

  const handleBack = () => {
    router.back()
  }

  const isLiked = likedReels.has(currentReel.id)
  const isSaved = savedReels.has(currentReel.id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
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
                <span className="text-2xl">{subject.icon}</span>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">{subject.name} Reels</h1>
                  <p className="text-xs text-muted-foreground">Quick study videos</p>
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Reels View */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            {/* Video Player Area */}
            <div className="space-y-4">
              <Card className="border-2 shadow-2xl overflow-hidden bg-black">
                <div className="relative aspect-[9/16] max-h-[600px] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  {/* Thumbnail/Video Placeholder */}
                  <img
                    src={currentReel.thumbnail || "/placeholder.svg"}
                    alt={currentReel.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Play/Pause Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Button
                      size="lg"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-16 h-16 rounded-full bg-white/90 hover:bg-white text-black shadow-2xl"
                    >
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </Button>
                  </div>

                  {/* Top Overlay - Duration */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-black/70 text-white border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {currentReel.duration}
                    </Badge>
                  </div>

                  {/* Bottom Overlay - Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <Badge className="mb-2">{currentReel.category}</Badge>
                    <h2 className="text-xl font-bold text-white mb-2">{currentReel.title}</h2>
                    <p className="text-sm text-white/80">{currentReel.description}</p>
                  </div>

                  {/* Right Side Actions */}
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
                      <span className="text-xs">{currentReel.likes + (isLiked ? 1 : 0)}</span>
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
                      className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white"
                    >
                      <Share2 className="w-6 h-6" />
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      onClick={() => setIsMuted(!isMuted)}
                      className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white"
                    >
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </Button>
                  </div>

                  {/* Navigation Arrows */}
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
                </div>
              </Card>

              {/* Key Points */}
              <Card className="border-2">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Key Points Covered</h3>
                  <ul className="space-y-2">
                    {currentReel.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-primary">{index + 1}</span>
                        </div>
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Reels List Sidebar */}
            <div className="lg:sticky lg:top-24 h-fit">
              <Card className="border-2">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-foreground">All Reels</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentReelIndex + 1} of {reels.length}
                  </p>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-3">
                    {reels.map((reel, index) => (
                      <Card
                        key={reel.id}
                        onClick={() => {
                          setCurrentReelIndex(index)
                          setIsPlaying(false)
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
                              <Badge className="mb-1 text-xs">{reel.category}</Badge>
                              <h4 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">{reel.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{reel.duration}</span>
                                <span>•</span>
                                <span>{reel.views} views</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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



