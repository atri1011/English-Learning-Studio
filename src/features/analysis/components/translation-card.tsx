import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, RefreshCw, AlertCircle, ChevronRight, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAnalysisStore } from "@/stores/analysis-store"
import { useReaderStore } from "@/stores/reader-store"
import type { Sentence } from "@/types/db"
import { cn } from "@/lib/utils"

interface TranslationCardProps {
  sentence: Sentence
}

interface FullTranslationResult {
  titleZh?: string
  translationZh: string
  summaryZh?: string
}

interface Alignment {
  id?: number
  source: string
  target: string
  sourceStart?: number
  sourceEnd?: number
  note?: string
}

interface SentenceTranslationResult {
  translationZh: string
  literalZh?: string
  difficulty?: string
  alignments?: Alignment[]
}

type TranslationMode = "sentence" | "article"

interface Segment {
  text: string
  alignmentId: number | null
  colorIndex: number
}

const ALIGNMENT_COLORS = [
  "bg-teal-500/15 text-teal-900 dark:text-teal-200",
  "bg-indigo-500/15 text-indigo-900 dark:text-indigo-200",
  "bg-orange-500/15 text-orange-900 dark:text-orange-200",
  "bg-pink-500/15 text-pink-900 dark:text-pink-200",
  "bg-lime-500/15 text-lime-900 dark:text-lime-200",
] as const

const ALIGNMENT_BG_ACTIVE = [
  "bg-teal-500/30",
  "bg-indigo-500/30",
  "bg-orange-500/30",
  "bg-pink-500/30",
  "bg-lime-500/30",
] as const

const ALIGNMENT_PILL_COLORS = [
  "border-teal-500/30 bg-teal-500/8",
  "border-indigo-500/30 bg-indigo-500/8",
  "border-orange-500/30 bg-orange-500/8",
  "border-pink-500/30 bg-pink-500/8",
  "border-lime-500/30 bg-lime-500/8",
] as const

function buildSegments(text: string, alignments: Alignment[]): Segment[] {
  if (!alignments || alignments.length === 0) return [{ text, alignmentId: null, colorIndex: 0 }]

  // Try span-based segmentation first
  const resolved = alignments
    .map((a, i) => {
      let start = a.sourceStart
      let end = a.sourceEnd
      if (start == null || end == null || start < 0 || end > text.length || start >= end) {
        // Fallback: text match
        const idx = text.indexOf(a.source)
        if (idx === -1) return null
        start = idx
        end = idx + a.source.length
      }
      return { ...a, id: a.id ?? i + 1, sourceStart: start, sourceEnd: end, colorIndex: i % 5 }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => a.sourceStart - b.sourceStart)

  if (resolved.length === 0) return [{ text, alignmentId: null, colorIndex: 0 }]

  const segments: Segment[] = []
  let cursor = 0

  for (const a of resolved) {
    if (a.sourceStart > cursor) {
      segments.push({ text: text.slice(cursor, a.sourceStart), alignmentId: null, colorIndex: 0 })
    }
    if (a.sourceStart >= cursor) {
      segments.push({ text: text.slice(a.sourceStart, a.sourceEnd), alignmentId: a.id, colorIndex: a.colorIndex })
      cursor = a.sourceEnd
    }
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), alignmentId: null, colorIndex: 0 })
  }

  return segments
}

function DifficultyBadge({ level }: { level: string }) {
  const dots = level === "较难" ? 3 : level === "中等" ? 2 : 1
  const color = level === "较难" ? "text-orange-500" : level === "中等" ? "text-amber-500" : "text-emerald-500"
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", color)}>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < dots ? "bg-current" : "bg-muted")} />
      ))}
      <span className="ml-0.5">{level}</span>
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])
  return (
    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCopy} title="复制翻译">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  )
}

export function TranslationCard({ sentence }: TranslationCardProps) {
  const [mode, setMode] = useState<TranslationMode>("sentence")
  const [activeAlignmentId, setActiveAlignmentId] = useState<number | null>(null)
  const [showLiteral, setShowLiteral] = useState(false)
  const rawText = useReaderStore((s) => s.rawText)
  const sentences = useReaderStore((s) => s.sentences)
  const selectSentence = useReaderStore((s) => s.selectSentence)
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

  // No mode reset on sentence change (Step 5) - user choice is preserved

  const sentenceResult = getResult(sentence.id, "translation")
  const sentenceLoading = isLoading(sentence.id, "translation")
  const articleResult = getArticleTranslationResult(sentence.articleId)
  const articleLoading = isArticleTranslationLoading(sentence.articleId)

  // Step 3: Cache fallback - determine effective result
  const sentenceData = sentenceResult?.status === "success"
    ? sentenceResult.resultJson as unknown as SentenceTranslationResult | undefined
    : undefined
  const isFromFullTranslation = !sentenceData?.alignments && sentenceData?.translationZh != null

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
            重试
          </Button>
        </div>
      )
    }

    const data = sentenceData
    if (!data?.translationZh) return null

    const alignments = data.alignments ?? []
    const segments = buildSegments(sentence.text, alignments)

    return (
      <div className="space-y-3">
        {/* From-full-translation badge */}
        {isFromFullTranslation && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              来自全文翻译
            </span>
            <Button onClick={handleAnalyzeSentence} size="sm" variant="outline" className="h-6 px-2 text-xs">
              获取详细翻译
            </Button>
          </div>
        )}

        {/* Difficulty badge */}
        {data.difficulty && (
          <DifficultyBadge level={data.difficulty} />
        )}

        {/* Color-annotated source sentence */}
        {alignments.length > 0 && (
          <div className="rounded-md border bg-muted/20 p-2.5">
            <p className="font-serif text-sm leading-relaxed">
              {segments.map((seg, i) =>
                seg.alignmentId != null ? (
                  <span
                    key={i}
                    className={cn(
                      "rounded px-0.5 py-0.5 cursor-default transition-colors",
                      ALIGNMENT_COLORS[seg.colorIndex],
                      activeAlignmentId === seg.alignmentId && ALIGNMENT_BG_ACTIVE[seg.colorIndex],
                    )}
                    onMouseEnter={() => setActiveAlignmentId(seg.alignmentId)}
                    onMouseLeave={() => setActiveAlignmentId(null)}
                  >
                    {seg.text}
                  </span>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </p>
          </div>
        )}

        {/* Main translation */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-medium text-muted-foreground mb-1">意译</h4>
            <p className="text-sm leading-relaxed">{data.translationZh}</p>
          </div>
          <CopyButton text={data.translationZh} />
        </div>

        {/* Literal translation (collapsed) */}
        {data.literalZh && (
          <div>
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowLiteral((v) => !v)}
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", showLiteral && "rotate-90")} />
              直译
            </button>
            {showLiteral && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground pl-4">
                {data.literalZh}
              </p>
            )}
          </div>
        )}

        {/* Alignment cards */}
        {alignments.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">短语对照</h4>
            <div className="space-y-1">
              {alignments.map((a, i) => {
                const id = a.id ?? i + 1
                const colorIdx = i % 5
                return (
                  <div
                    key={id}
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors cursor-default",
                      ALIGNMENT_PILL_COLORS[colorIdx],
                      activeAlignmentId === id && "ring-1 ring-foreground/20",
                    )}
                    onMouseEnter={() => setActiveAlignmentId(id)}
                    onMouseLeave={() => setActiveAlignmentId(null)}
                  >
                    <span className="font-serif text-foreground/80 shrink-0">{a.source}</span>
                    <span className="text-muted-foreground shrink-0">→</span>
                    <span className="text-foreground">{a.target}</span>
                    {a.note && (
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">({a.note})</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Refresh button (icon-only) */}
        {!isFromFullTranslation && (
          <Button
            onClick={handleAnalyzeSentence}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="重新翻译"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    )
  }

  const renderArticleTranslation = () => {
    if (!articleResult && !articleLoading) {
      return (
        <div className="flex flex-col items-center py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            点击"全文翻译"生成整篇中文译文
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
      <div className="space-y-3">
        {data.summaryZh && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">摘要</h4>
            <p className="text-sm text-muted-foreground">{data.summaryZh}</p>
          </div>
        )}

        {/* Sentence-level bilingual list (Step 4) */}
        <BilingualSentenceList
          sentences={sentences}
          currentSentenceId={sentence.id}
          getResult={getResult}
          onSelectSentence={selectSentence}
        />

        <Button
          onClick={handleAnalyzeArticle}
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          title="重新全文翻译"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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

// Step 4: Bilingual sentence list for article mode
function BilingualSentenceList({
  sentences,
  currentSentenceId,
  getResult,
  onSelectSentence,
}: {
  sentences: Sentence[]
  currentSentenceId: string
  getResult: (sentenceId: string, type: "translation") => { resultJson: unknown; status: string } | undefined
  onSelectSentence: (id: string) => void
}) {
  const currentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [currentSentenceId])

  if (sentences.length === 0) return null

  return (
    <div className="rounded-md border bg-muted/10 max-h-80 overflow-y-auto">
      <h4 className="text-xs font-medium text-muted-foreground px-3 py-2 border-b sticky top-0 bg-background/95 backdrop-blur-sm">
        全文双语对照
      </h4>
      <div className="divide-y divide-border/50">
        {sentences.map((s, i) => {
          const isCurrent = s.id === currentSentenceId
          const result = getResult(s.id, "translation")
          const translationZh = result?.status === "success"
            ? (result.resultJson as { translationZh?: string })?.translationZh
            : undefined

          return (
            <div
              key={s.id}
              ref={isCurrent ? currentRef : undefined}
              className={cn(
                "px-3 py-2 cursor-pointer transition-colors hover:bg-muted/30",
                isCurrent && "bg-primary/5 border-l-2 border-l-primary",
              )}
              onClick={() => onSelectSentence(s.id)}
            >
              <p className={cn("text-xs leading-relaxed font-serif", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                <span className="text-muted-foreground/50 mr-1 text-[10px]">{i + 1}.</span>
                {s.text}
              </p>
              {translationZh ? (
                <p className="text-xs leading-relaxed mt-0.5 text-foreground/70">{translationZh}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground/40 mt-0.5">暂无翻译</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
