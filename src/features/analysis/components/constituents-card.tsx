import { useEffect } from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAnalysisStore } from "@/stores/analysis-store"
import type { Sentence } from "@/types/db"
import { cn } from "@/lib/utils"

interface ConstituentsCardProps {
  sentence: Sentence
}

interface ConstituentsResult {
  spans: Array<{ label: string; text: string; labelZh: string }>
  structure?: string
  notes?: string
}

const CONSTITUENT_LABELS_ZH: Record<string, string> = {
  S: "主语", V: "谓语", O: "宾语",
  Attr: "定语", Adv: "状语", Comp: "补语",
}

const CONSTITUENT_COLORS: Record<string, string> = {
  S: "bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200",
  V: "bg-blue-500/15 border-blue-500/40 text-blue-900 dark:text-blue-200",
  O: "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200",
  Attr: "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200",
  Adv: "bg-violet-500/15 border-violet-500/40 text-violet-900 dark:text-violet-200",
  Comp: "bg-cyan-500/15 border-cyan-500/40 text-cyan-900 dark:text-cyan-200",
}

export function ConstituentsCard({ sentence }: ConstituentsCardProps) {
  const { getResult, isLoading, analyze, loadCachedResults } = useAnalysisStore()

  useEffect(() => {
    loadCachedResults(sentence.id)
  }, [sentence.id, loadCachedResults])

  const result = getResult(sentence.id, "constituents")
  const loading = isLoading(sentence.id, "constituents")

  const handleAnalyze = () => analyze(sentence, "constituents")

  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          点击分析句子成分
        </p>
        <Button onClick={handleAnalyze} size="sm" className="gap-2">
          分析成分
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">分析成分中...</span>
      </div>
    )
  }

  if (result?.status === "failed") {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <AlertCircle className="h-5 w-5 text-destructive mb-2" />
        <p className="text-sm text-destructive mb-1">{result.errorMessage}</p>
        <Button onClick={handleAnalyze} size="sm" variant="outline" className="gap-2 mt-2">
          <RefreshCw className="h-3.5 w-3.5" />
          重试
        </Button>
      </div>
    )
  }

  const data = result?.resultJson as ConstituentsResult | undefined
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Visual Sentence with Highlighted Constituents */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">句子成分</h4>
        <div className="flex flex-wrap gap-1.5 leading-relaxed">
          {data.spans.map((span, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex flex-col items-center rounded-md border-b-2 px-1.5 py-0.5",
                CONSTITUENT_COLORS[span.label] || "bg-muted border-muted-foreground/30",
              )}
            >
              <span className="text-sm font-serif">{span.text}</span>
              <span className="text-[10px] font-medium opacity-70">{span.labelZh}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">图例</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONSTITUENT_COLORS).map(([label, color]) => (
            <span
              key={label}
              className={cn("text-xs px-1.5 py-0.5 rounded", color)}
            >
              {CONSTITUENT_LABELS_ZH[label] || label}({label})
            </span>
          ))}
        </div>
      </div>

      {data.structure && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-1.5">句型结构</h4>
          <p className="text-sm">{data.structure}</p>
        </div>
      )}

      {data.notes && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-1.5">补充说明</h4>
          <p className="text-sm text-muted-foreground">{data.notes}</p>
        </div>
      )}

      <Button onClick={handleAnalyze} size="sm" variant="ghost" className="gap-2 text-xs">
        <RefreshCw className="h-3 w-3" />
        重新分析
      </Button>
    </div>
  )
}
