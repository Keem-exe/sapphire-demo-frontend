"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface AddSubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddSubject: (subject: any) => void
  level: "csec" | "cape"
}

const SUBJECT_ICONS = ["📐", "📚", "🧪", "⚡", "🧬", "🌍", "💻", "🎨", "🎵", "⚽", "🏛️", "💼"]

const COLOR_OPTIONS = [
  { name: "Blue", value: "from-blue-500 to-cyan-500" },
  { name: "Purple", value: "from-purple-500 to-pink-500" },
  { name: "Green", value: "from-green-500 to-emerald-500" },
  { name: "Orange", value: "from-orange-500 to-red-500" },
  { name: "Teal", value: "from-teal-500 to-green-500" },
  { name: "Indigo", value: "from-indigo-500 to-purple-500" },
  { name: "Rose", value: "from-rose-500 to-pink-500" },
  { name: "Amber", value: "from-amber-500 to-orange-500" },
]

export function AddSubjectDialog({ open, onOpenChange, onAddSubject, level }: AddSubjectDialogProps) {
  const [name, setName] = useState("")
  const [selectedIcon, setSelectedIcon] = useState(SUBJECT_ICONS[0])
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].value)

  const handleSubmit = () => {
    if (!name.trim()) return

    const newSubject = {
      id: `${level}-${Date.now()}`,
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      progress: 0,
      lastStudied: "Never",
      topics: 0,
      type: level,
      ...(level === "cape" && {
        units: [
          { unitNumber: 1, progress: 0, lastStudied: "Never", topics: 0 },
          { unitNumber: 2, progress: 0, lastStudied: "Never", topics: 0 },
        ],
      }),
    }

    onAddSubject(newSubject)
    setName("")
    setSelectedIcon(SUBJECT_ICONS[0])
    setSelectedColor(COLOR_OPTIONS[0].value)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Subject</DialogTitle>
          <DialogDescription>
            Create a new {level === "csec" ? "CSEC" : "CAPE"} subject to track your studies
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Subject Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Subject Name</Label>
            <Input
              id="name"
              placeholder="e.g., Mathematics, Physics, Chemistry"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Choose an Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {SUBJECT_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`aspect-square rounded-xl border-2 text-3xl flex items-center justify-center transition-all hover:scale-110 ${
                    selectedIcon === icon
                      ? "border-primary bg-primary/10 scale-110"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Choose a Color</Label>
            <RadioGroup value={selectedColor} onValueChange={setSelectedColor} className="grid grid-cols-4 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <div key={color.value} className="relative">
                  <RadioGroupItem value={color.value} id={color.value} className="peer sr-only" />
                  <Label
                    htmlFor={color.value}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 cursor-pointer transition-all hover:scale-105 peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary peer-data-[state=checked]:ring-offset-2`}
                  >
                    <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${color.value} mb-2`} />
                    <span className="text-xs font-medium">{color.name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="p-4 rounded-xl border-2 bg-card">
              <div className={`h-2 bg-gradient-to-r ${selectedColor} rounded-t-lg mb-4`} />
              <div className="flex items-center gap-3">
                <div className="text-4xl">{selectedIcon}</div>
                <div>
                  <h3 className="font-semibold text-lg">{name || "Subject Name"}</h3>
                  <p className="text-sm text-muted-foreground">{level === "csec" ? "CSEC" : "CAPE"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground"
          >
            Add Subject
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
