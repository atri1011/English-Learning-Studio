import { useEffect, useState } from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAnalysisStore } from "@/stores/analysis-store"
import { PracticeStep } from "./practice-step"
import type { Sentence } from "@/types/db"
import { cn } from "@/lib/utils"

interface ExplanationCardProps {
  sentence: Sentence
}

interface PracticeItem {
  type: "choice" | "fill" | "translate"
  question: string
  options?: string[]
  answer: string | number
  explanation: string
}

interface ExplanationResult {
  level: string
  grammarPoints?: Array<{ title: string; explain: string; example: string }>
  vocabulary?: Array<{ word: string; phonetic?: string; meaningZh: string; usage: string }>
  expressionTips?: string[]
  pitfalls?: string[]
  practice?: PracticeItem[] | { question: string; referenceAnswer: string }
}

const STEPS = ["词汇", "语法", "技巧", "练习"]

export function ExplanationCard({ sentence }: ExplanationCardProps) {
  const { getResult, isLoading, analyze, loadCachedResults } = useAnalysisStore()
  const [step, setStep] = useState(0)

  useEffect(() => {
    loadCachedResults(sentence.id)
  }, [sentence.id, loadCachedResults])

  // 切换句子时重置步骤
  useEffect(() => {
    setStep(0)
  }, [sentence.id])

  const result = getResult(sentence.id, "explanation")
  const loading = isLoading(sentence.id, "explanation")

  const handleAnalyze = () => analyze(sentence, "explanation")

  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          点击获取详细讲解
        </p>
        <Button onClick={handleAnalyze} size="sm" className="gap-2">
          逐句讲解
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">生成讲解中...</span>
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

  const data = result?.resultJson as ExplanationResult | undefined
  if (!data) return null

  // 兼容旧格式 practice（单个对象 → 包装为数组）
  const practiceItems: PracticeItem[] = Array.isArray(data.practice)
    ? data.practice
    : data.practice
      ? [{
          type: "translate" as const,
          question: (data.practice as { question: string; referenceAnswer: string }).question,
          answer: (data.practice as { question: string; referenceAnswer: string }).referenceAnswer,
          explanation: "",
        }]
      : []

  return (
    <div className="space-y-4">
      {/* 难度标签 */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">难度: {data.level}</Badge>
      </div>

      {/* 步骤指示器 */}
      <div className="flex gap-1">
        {STEPS.map((label, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md transition-colors",
              i === step
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Separator />

      {/* 步骤内容 */}
      {step === 0 && <VocabularyStep data={data.vocabulary} />}
      {step === 1 && <GrammarStep data={data.grammarPoints} />}
      {step === 2 && <TipsStep tips={data.expressionTips} pitfalls={data.pitfalls} />}
      {step === 3 && <PracticeStep data={practiceItems} />}

      {/* 底部导航 */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="text-xs"
        >
          上一步
        </Button>
        <span className="text-xs text-muted-foreground">
          {step + 1} / {STEPS.length}
        </span>
        <Button
          size="sm"
          onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
          disabled={step === STEPS.length - 1}
          className="text-xs"
        >
          下一步
        </Button>
      </div>

      <Button onClick={handleAnalyze} size="sm" variant="ghost" className="gap-2 text-xs">
        <RefreshCw className="h-3 w-3" />
        重新分析
      </Button>
    </div>
  )
}

function VocabularyStep({ data }: { data: ExplanationResult["vocabulary"] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无核心词汇</p>
  }

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-2">核心词汇</h4>
      <div className="space-y-2.5">
        {data.map((v, i) => (
          <div key={i} className="rounded-md bg-muted/50 p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold font-serif">{v.word}</span>
              {v.phonetic && (
                <span className="text-xs text-muted-foreground">{v.phonetic}</span>
              )}
            </div>
            <p className="text-sm">{v.meaningZh}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{v.usage}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function GrammarStep({ data }: { data: ExplanationResult["grammarPoints"] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无语法要点</p>
  }

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-2">语法要点</h4>
      <div className="space-y-2.5">
        {data.map((p, i) => (
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
  )
}

function TipsStep({ tips, pitfalls }: { tips?: string[]; pitfalls?: string[] }) {
  const hasTips = tips && tips.length > 0
  const hasPitfalls = pitfalls && pitfalls.length > 0

  if (!hasTips && !hasPitfalls) {
    return <p className="text-sm text-muted-foreground">暂无表达技巧和易错点</p>
  }

  return (
    <div className="space-y-4">
      {hasTips && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">表达技巧</h4>
          <ul className="space-y-1">
            {tips!.map((tip, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-primary shrink-0">*</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasPitfalls && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">易错点</h4>
          <ul className="space-y-1">
            {pitfalls!.map((p, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-destructive shrink-0">!</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
