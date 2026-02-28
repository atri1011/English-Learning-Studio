import { useEffect } from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAnalysisStore } from "@/stores/analysis-store"
import type { Sentence } from "@/types/db"

interface ExplanationCardProps {
  sentence: Sentence
}

interface ExplanationResult {
  level: string
  grammarPoints?: Array<{ title: string; explain: string; example: string }>
  vocabulary?: Array<{ word: string; phonetic?: string; meaningZh: string; usage: string }>
  expressionTips?: string[]
  pitfalls?: string[]
  practice?: { question: string; referenceAnswer: string }
}

export function ExplanationCard({ sentence }: ExplanationCardProps) {
  const { getResult, isLoading, analyze, loadCachedResults } = useAnalysisStore()

  useEffect(() => {
    loadCachedResults(sentence.id)
  }, [sentence.id, loadCachedResults])

  const result = getResult(sentence.id, "explanation")
  const loading = isLoading(sentence.id, "explanation")

  const handleAnalyze = () => analyze(sentence, "explanation")

  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Click to get a detailed explanation
        </p>
        <Button onClick={handleAnalyze} size="sm" className="gap-2">
          Explain Sentence
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Generating explanation...</span>
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
          Retry
        </Button>
      </div>
    )
  }

  const data = result?.resultJson as ExplanationResult | undefined
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">CEFR {data.level}</Badge>
      </div>

      {data.grammarPoints && data.grammarPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Grammar Points</h4>
          <div className="space-y-2.5">
            {data.grammarPoints.map((p, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-2.5">
                <p className="text-sm font-medium mb-1">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.explain}</p>
                {p.example && (
                  <p className="text-sm font-serif italic mt-1.5 text-primary/80">
                    e.g. {p.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.vocabulary && data.vocabulary.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Vocabulary</h4>
            <div className="space-y-2">
              {data.vocabulary.map((v, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold font-serif">{v.word}</span>
                    {v.phonetic && (
                      <span className="text-xs text-muted-foreground">{v.phonetic}</span>
                    )}
                  </div>
                  <span className="text-sm">{v.meaningZh}</span>
                  <span className="text-xs text-muted-foreground">{v.usage}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {data.expressionTips && data.expressionTips.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Expression Tips</h4>
            <ul className="space-y-1">
              {data.expressionTips.map((tip, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-primary shrink-0">*</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {data.pitfalls && data.pitfalls.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Common Pitfalls</h4>
            <ul className="space-y-1">
              {data.pitfalls.map((p, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-destructive shrink-0">!</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {data.practice && (
        <>
          <Separator />
          <div className="rounded-md bg-primary/5 p-3">
            <h4 className="text-xs font-medium mb-2">Practice</h4>
            <p className="text-sm mb-2">{data.practice.question}</p>
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer text-primary text-xs">Show answer</summary>
              <p className="mt-1.5">{data.practice.referenceAnswer}</p>
            </details>
          </div>
        </>
      )}

      <Button onClick={handleAnalyze} size="sm" variant="ghost" className="gap-2 text-xs">
        <RefreshCw className="h-3 w-3" />
        Re-analyze
      </Button>
    </div>
  )
}
