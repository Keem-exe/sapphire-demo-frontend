"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { TopicGroup } from "@/lib/services/subject-topics";

/** Checkbox list of topics, grouped under module headings when the subject has modules. */
export function TopicPicker({
  groups,
  selected,
  onToggle,
  loading,
  error,
}: {
  groups: TopicGroup[];
  selected: string[];
  onToggle: (key: string) => void;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading topics…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!groups.some((g) => g.topics.length)) {
    return <p className="text-sm text-muted-foreground">No topics are available for this subject yet.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.moduleNumber ?? "flat"} className="space-y-2">
          {g.title && <p className="text-sm font-semibold text-foreground">{g.title}</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {g.topics.map((t) => (
              <label key={t.key} className="flex items-start gap-2 text-sm">
                <Checkbox className="mt-0.5" checked={selected.includes(t.key)} onCheckedChange={() => onToggle(t.key)} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
