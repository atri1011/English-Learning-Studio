import { useEffect } from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAnalysisStore } from "@/stores/analysis-store"
import type { Sentence } from "@/types/db"

interface TranslationCardProps {
  sentence: Sentence
}

interface TranslationResult {
  translationZh: string
  literalZh?: string
  alignments?: Array<{ source: string; target: string; note?: string }>
}

export function TranslationCard({ sentence }: TranslationCardProps) {
  const { getResult, isLoading, analyze, loadCachedResults } = useAnalysisStore()

  useEffect(() => {
    loadCachedResults(sentence.id)
  }, [sentence.id, loadCachedResults])

  const result = getResult(sentence.id, "translation")
  const loading = isLoading(sentence.id, "translation")

  const handleAnalyze = () => analyze(sentence, "translation")

  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          点击生成中文翻译
        </p>
        <Button onClick={handleAnalyze} size="sm" className="gap-2">
          翻译
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">翻译中...</span>
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

  const data = result?.resultJson as TranslationResult | undefined
  if (!data) return null

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-1.5">意译</h4>
        <p className="text-sm leading-relaxed">{data.translationZh}</p>
      </div>

      {data.literalZh && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-1.5">直译</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{data.literalZh}</p>
        </div>
      )}

      {data.alignments && data.alignments.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">短语对照</h4>
          <div className="space-y-1.5">
            {data.alignments.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="font-serif text-primary/80">{a.source}</span>
                <span className="text-muted-foreground">→</span>
                <span>{a.target}</span>
                {a.note && (
                  <span className="text-xs text-muted-foreground">({a.note})</span>
                )}
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
