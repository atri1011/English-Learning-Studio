import { useEffect, useState } from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAnalysisStore } from "@/stores/analysis-store"
import { useReaderStore } from "@/stores/reader-store"
import type { Sentence } from "@/types/db"

interface TranslationCardProps {
  sentence: Sentence
}

interface FullTranslationResult {
  titleZh?: string
  translationZh: string
  summaryZh?: string
}

interface SentenceTranslationResult {
  translationZh: string
  literalZh?: string
  alignments?: Array<{ source: string; target: string; note?: string }>
}

type TranslationMode = "sentence" | "article"

export function TranslationCard({ sentence }: TranslationCardProps) {
  const [mode, setMode] = useState<TranslationMode>("sentence")
  const [showFullArticleText, setShowFullArticleText] = useState(false)
  const rawText = useReaderStore((s) => s.rawText)
  const {
    getResult,
    isLoading,
    analyze,
    loadCachedResults,
    getArticleTranslationResult,
    isArticleTranslationLoading,
    analyzeArticleTranslation,
    loadCachedArticleTranslation,
  } = useAnalysisStore()

  useEffect(() => {
    loadCachedResults(sentence.id)
  }, [sentence.id, loadCachedResults])

  useEffect(() => {
    loadCachedArticleTranslation(sentence.articleId)
  }, [sentence.articleId, loadCachedArticleTranslation])

  // 切换句子时优先回到逐句翻译视图，避免始终展示整篇译文
  useEffect(() => {
    setMode("sentence")
    setShowFullArticleText(false)
  }, [sentence.id])

  const sentenceResult = getResult(sentence.id, "translation")
  const sentenceLoading = isLoading(sentence.id, "translation")
  const articleResult = getArticleTranslationResult(sentence.articleId)
  const articleLoading = isArticleTranslationLoading(sentence.articleId)

  const handleAnalyzeSentence = () => analyze(sentence, "translation")
  const handleAnalyzeArticle = () => analyzeArticleTranslation(sentence.articleId, rawText)

  const renderSentenceTranslation = () => {
    if (!sentenceResult && !sentenceLoading) {
      return (
        <div className="flex flex-col items-center py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            点击生成当前句子的中文翻译
          </p>
          <Button onClick={handleAnalyzeSentence} size="sm" className="gap-2">
            逐句翻译
          </Button>
        </div>
      )
    }

    if (sentenceLoading) {
      return (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">逐句翻译中...</span>
        </div>
      )
    }

    if (sentenceResult?.status === "failed") {
      return (
        <div className="flex flex-col items-center py-4 text-center">
          <AlertCircle className="h-5 w-5 text-destructive mb-2" />
          <p className="text-sm text-destructive mb-1">{sentenceResult.errorMessage}</p>
          <Button onClick={handleAnalyzeSentence} size="sm" variant="outline" className="gap-2 mt-2">
            <RefreshCw className="h-3.5 w-3.5" />
            重试逐句翻译
          </Button>
        </div>
      )
    }

    const data = sentenceResult?.resultJson as SentenceTranslationResult | undefined
    if (!data?.translationZh) return null

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

        <Button onClick={handleAnalyzeSentence} size="sm" variant="ghost" className="gap-2 text-xs">
          <RefreshCw className="h-3 w-3" />
          重新逐句翻译
        </Button>
      </div>
    )
  }

  const renderArticleTranslation = () => {
    if (!articleResult && !articleLoading) {
      return (
        <div className="flex flex-col items-center py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            点击“全文翻译”生成整篇中文译文
          </p>
          <Button onClick={handleAnalyzeArticle} size="sm" className="gap-2">
            全文翻译
          </Button>
        </div>
      )
    }

    if (articleLoading) {
      return (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">全文翻译中...</span>
        </div>
      )
    }

    if (articleResult?.status === "failed") {
      return (
        <div className="flex flex-col items-center py-4 text-center">
          <AlertCircle className="h-5 w-5 text-destructive mb-2" />
          <p className="text-sm text-destructive mb-1">{articleResult.errorMessage}</p>
          <Button onClick={handleAnalyzeArticle} size="sm" variant="outline" className="gap-2 mt-2">
            <RefreshCw className="h-3.5 w-3.5" />
            重试全文翻译
          </Button>
        </div>
      )
    }

    const data = articleResult?.resultJson as FullTranslationResult | undefined
    if (!data?.translationZh) return null

    return (
      <div className="space-y-4">
        {data.titleZh && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">中文标题</h4>
            <p className="text-sm leading-relaxed">{data.titleZh}</p>
          </div>
        )}

        {data.summaryZh && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">摘要</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{data.summaryZh}</p>
          </div>
        )}

        <div className="rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-medium text-muted-foreground">全文译文</h4>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setShowFullArticleText((v) => !v)}
            >
              {showFullArticleText ? "收起全文" : "展开全文"}
            </Button>
          </div>
          {showFullArticleText ? (
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{data.translationZh}</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              已生成全文翻译，点击“展开全文”查看完整内容。
            </p>
          )}
        </div>

        <Button onClick={handleAnalyzeArticle} size="sm" variant="ghost" className="gap-2 text-xs">
          <RefreshCw className="h-3 w-3" />
          重新全文翻译
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center rounded-md border bg-muted/40 p-1">
        <Button
          size="sm"
          variant={mode === "sentence" ? "secondary" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => setMode("sentence")}
        >
          逐句
        </Button>
        <Button
          size="sm"
          variant={mode === "article" ? "secondary" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => setMode("article")}
        >
          全文
        </Button>
      </div>

      {mode === "sentence" ? renderSentenceTranslation() : renderArticleTranslation()}
    </div>
  )
}
