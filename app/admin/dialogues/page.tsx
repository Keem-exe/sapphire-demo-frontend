"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/admin/common"
import { ReviewTab } from "@/components/admin/dialogues/review-tab"
import { UploadTab } from "@/components/admin/dialogues/upload-tab"

export default function DialoguesPage() {
  return (
    <Suspense>
      <Dialogues />
    </Suspense>
  )
}

function Dialogues() {
  const router = useRouter()
  const sp = useSearchParams()
  const tab = sp.get("tab") === "review" ? "review" : "upload"

  return (
    <>
      <PageHeader
        title="Tutoring Dialogues"
        description="Real tutoring sessions that teach the model how to tutor. Only admins can see these; they involve students."
      />
      <Tabs value={tab} onValueChange={(t) => router.replace(`/admin/dialogues?tab=${t}`)}>
        <TabsList className="mb-4">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>
        <TabsContent value="upload"><UploadTab /></TabsContent>
        <TabsContent value="review"><ReviewTab /></TabsContent>
      </Tabs>
    </>
  )
}
