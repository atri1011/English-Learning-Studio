import type { PracticeDimensionScores } from "@/types/db"
import { cn } from "@/lib/utils"

const dimensions = [
  { key: "semantic" as const, label: "语义准确度" },
  { key: "grammar" as const, label: "语法正确性" },
  { key: "lexical" as const, label: "词汇运用" },
  { key: "naturalness" as const, label: "自然度" },
]

function scoreColor(score: number): string {
  if (score >= 85) return "bg-green-500"
  if (score >= 70) return "bg-blue-500"
  if (score >= 60) return "bg-yellow-500"
  return "bg-red-500"
}

export function ScoreRadar({ scores }: { scores: PracticeDimensionScores }) {
  return (
    <div className="space-y-3">
      {dimensions.map(({ key, label }) => {
        const score = scores[key]
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{score}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", scoreColor(score))}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
