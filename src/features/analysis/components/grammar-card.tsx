import { useEffect } from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAnalysisStore } from "@/stores/analysis-store"
import type { Sentence } from "@/types/db"

interface GrammarCardProps {
  sentence: Sentence
}

interface GrammarResult {
  summary: string
  tense: { primary: string; label: string; why?: string; signal?: string }
  voice: string
  clauses?: Array<{ type: string; text: string; role: string; label: string }>
  keyPoints?: Array<{ title: string; explain: string }>
}

export function GrammarCard({ sentence }: GrammarCardProps) {
  const { getResult, isLoading, analyze, loadCachedResults } = useAnalysisStore()

  useEffect(() => {
    loadCachedResults(sentence.id)
  }, [sentence.id, loadCachedResults])

  const result = getResult(sentence.id, "grammar")
  const loading = isLoading(sentence.id, "grammar")

  const handleAnalyze = () => analyze(sentence, "grammar")

  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          点击分析语法结构
        </p>
        <Button onClick={handleAnalyze} size="sm" className="gap-2">
          分析语法
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">分析语法中...</span>
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

  const data = result?.resultJson as GrammarResult | undefined
  if (!data) return null

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-1.5">概要</h4>
        <p className="text-sm leading-relaxed">{data.summary}</p>
      </div>

      <div className="rounded-md bg-muted/50 p-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary">{data.tense?.label || data.tense?.primary}</Badge>
          <Badge variant="outline">{data.voice === "passive" ? "被动语态" : "主动语态"}</Badge>
        </div>
        {data.tense?.signal && (
          <p className="text-xs text-primary/80 mb-1">标志: {data.tense.signal}</p>
        )}
        {data.tense?.why && (
          <p className="text-sm text-muted-foreground">{data.tense.why}</p>
        )}
      </div>

      {data.clauses && data.clauses.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">子句分析</h4>
          <div className="space-y-2">
            {data.clauses.map((c, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{c.label || c.type}</Badge>
                  <span className="text-xs text-muted-foreground">{c.role}</span>
                </div>
                <p className="text-sm font-serif italic">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.keyPoints && data.keyPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">要点</h4>
          <div className="space-y-2">
            {data.keyPoints.map((p, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.explain}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handleAnalyze} size="sm" variant="ghost" className="gap-2 text-xs">
        <RefreshCw className="h-3 w-3" />
        重新分析
      </Button>
    </div>
  )
}
