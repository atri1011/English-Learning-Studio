import type { PracticeAttempt } from "@/types/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScoreRadar } from "./score-radar"
import { DiffList } from "./diff-list"
import { useState } from "react"
import { BookOpen, ChevronDown, ChevronUp, User } from "lucide-react"
import { Button } from "@/components/ui/button"

function gradeLabel(score: number): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (score >= 85) return { text: "优秀", variant: "default" }
  if (score >= 70) return { text: "良好", variant: "secondary" }
  if (score >= 60) return { text: "及格", variant: "outline" }
  return { text: "需提高", variant: "destructive" }
}

interface EvaluationResultProps {
  attempt: PracticeAttempt
  sourceText?: string
}

export function EvaluationResult({ attempt, sourceText }: EvaluationResultProps) {
  const [diffsExpanded, setDiffsExpanded] = useState(true)
  const [comparisonExpanded, setComparisonExpanded] = useState(true)
  const grade = gradeLabel(attempt.overallScore)
  const dualScores = attempt.dualScores ?? {
    cet46: attempt.overallScore,
    daily: attempt.overallScore,
  }
  const errorMetrics = attempt.errorMetrics ?? { ser: 0, fer: 0, rer: 0 }
  const reviewPlanDays = attempt.reviewPlanDays?.length ? attempt.reviewPlanDays : [3, 7]

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4">
            <div className="text-5xl font-bold tabular-nums">{attempt.overallScore}</div>
            <Badge variant={grade.variant} className="text-sm px-3 py-1">
              {grade.text}
            </Badge>
          </div>
          {attempt.verdictZh && (
            <p className="text-center text-sm text-muted-foreground mt-3">{attempt.verdictZh}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">四六级评分</p>
              <p className="text-lg font-semibold tabular-nums">{dualScores.cet46}</p>
            </div>
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">日常表达评分</p>
              <p className="text-lg font-semibold tabular-nums">{dualScores.daily}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">错误率指标</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">SER 语义错误率</p>
              <p className="text-lg font-semibold tabular-nums">{errorMetrics.ser}%</p>
            </div>
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">FER 形式错误率</p>
              <p className="text-lg font-semibold tabular-nums">{errorMetrics.fer}%</p>
            </div>
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">RER 重复错误率</p>
              <p className="text-lg font-semibold tabular-nums">{errorMetrics.rer}%</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">建议复测</p>
            <div className="flex flex-wrap gap-2">
              {reviewPlanDays.map((day) => (
                <Badge key={day} variant="outline">D+{day}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Comparison */}
      {sourceText && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">原文对照</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setComparisonExpanded(!comparisonExpanded)}
              >
                {comparisonExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {comparisonExpanded ? "收起" : "展开"}
              </Button>
            </div>
          </CardHeader>
          {comparisonExpanded && (
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    英文原文
                  </p>
                  <p className="text-sm font-serif whitespace-pre-wrap leading-relaxed bg-muted/50 border border-muted-foreground/10 rounded-md p-3">
                    {sourceText}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    你的回译
                  </p>
                  <p className="text-sm font-serif whitespace-pre-wrap leading-relaxed bg-muted/50 border border-muted-foreground/10 rounded-md p-3">
                    {attempt.userTranslation}
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Diffs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">错误分析 ({attempt.diffs.length})</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDiffsExpanded(!diffsExpanded)}
            >
              {diffsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {diffsExpanded ? "收起" : "展开"}
            </Button>
          </div>
        </CardHeader>
        {diffsExpanded && (
          <CardContent>
            <DiffList diffs={attempt.diffs} />
          </CardContent>
        )}
      </Card>

      {/* Better Versions */}
      {(attempt.betterVersion.minimalEdit || attempt.betterVersion.naturalAlt) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">修正版本</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attempt.betterVersion.minimalEdit && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">最小修正版</p>
                <p className="text-sm font-serif whitespace-pre-wrap leading-relaxed bg-muted/50 rounded-md p-3">
                  {attempt.betterVersion.minimalEdit}
                </p>
              </div>
            )}
            {attempt.betterVersion.naturalAlt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">更自然的表达</p>
                <p className="text-sm font-serif whitespace-pre-wrap leading-relaxed bg-muted/50 rounded-md p-3">
                  {attempt.betterVersion.naturalAlt}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Strengths & Next Focus */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {attempt.strengths.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-green-600 dark:text-green-400">做得好</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {attempt.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-green-500 shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {attempt.nextFocus.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-yellow-600 dark:text-yellow-400">下次注意</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {attempt.nextFocus.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-yellow-500 shrink-0">-</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dimension Scores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">四维评分</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreRadar scores={attempt.dimensionScores} />
        </CardContent>
      </Card>
    </div>
  )
}
