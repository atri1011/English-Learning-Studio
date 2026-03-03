import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { PracticeMaterial } from "@/types/db"

interface PracticeSessionProps {
  material: PracticeMaterial
  onSubmit: (userTranslation: string) => void
  evaluating: boolean
  progress: { current: number; total: number } | null
}

export function PracticeSession({ material, onSubmit, evaluating, progress }: PracticeSessionProps) {
  const [userTranslation, setUserTranslation] = useState("")
  const [promptExpanded, setPromptExpanded] = useState(true)

  const handleSubmit = () => {
    if (!userTranslation.trim() || evaluating) return
    onSubmit(userTranslation.trim())
  }

  return (
    <div className="space-y-6">
      {/* Chinese prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">中文原文</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPromptExpanded(!promptExpanded)}
          >
            {promptExpanded ? "折叠" : "展开"}
          </Button>
        </div>
        {promptExpanded && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
            {material.promptText}
          </div>
        )}
      </div>

      {/* User translation input */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">你的英文回译</h3>
        <Textarea
          placeholder="根据上方中文翻译，用英文写出原文..."
          value={userTranslation}
          onChange={(e) => setUserTranslation(e.target.value)}
          className="min-h-[200px] font-serif"
          disabled={evaluating}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {evaluating && progress && progress.total > 1
            ? `评估中 ${progress.current}/${progress.total}...`
            : evaluating
              ? "评估中..."
              : ""}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!userTranslation.trim() || evaluating}
          className="gap-2"
        >
          {evaluating && <Loader2 className="h-4 w-4 animate-spin" />}
          {evaluating ? "评估中" : "提交评估"}
        </Button>
      </div>
    </div>
  )
}
