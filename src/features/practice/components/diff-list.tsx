import { useId, useState } from "react"
import type { PracticeDiffItem } from "@/types/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info } from "lucide-react"

const typeLabels: Record<PracticeDiffItem["type"], string> = {
  missing: "缺失",
  wrong: "错误",
  extra: "多余",
  reorder: "语序",
}

const severityStyles: Record<PracticeDiffItem["severity"], string> = {
  critical: "border-l-red-500",
  major: "border-l-amber-500",
  minor: "border-l-blue-500",
}

const severityBadge: Record<PracticeDiffItem["severity"], string> = {
  critical: "destructive",
  major: "default",
  minor: "secondary",
}

const SeverityIcon: Record<PracticeDiffItem["severity"], React.ElementType> = {
  critical: AlertCircle,
  major: AlertTriangle,
  minor: Info,
}

const categoryLabels: Record<NonNullable<PracticeDiffItem["category"]>, string> = {
  M: "语义",
  G: "语法",
  L: "搭配",
  R: "语域",
  D: "篇章",
  C: "约束",
}

const rootCauseLabels: Record<NonNullable<PracticeDiffItem["rootCause"]>, string> = {
  K: "知识缺口",
  I: "母语迁移",
  S: "检索失败",
  O: "过度泛化",
  A: "注意力失误",
}

const severityOrder: Record<PracticeDiffItem["severity"], number> = {
  critical: 0,
  major: 1,
  minor: 2,
}

/** 单条错误项（用在分组卡片内部） */
function DiffErrorItem({ diff, index }: { diff: PracticeDiffItem; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()
  const Icon = SeverityIcon[diff.severity]
  const hasDetails = diff.category || diff.rootCause || diff.preventionTipZh || diff.drillZh

  return (
    <div
      className={cn(
        "rounded-md border-l-4 p-3 space-y-2.5 bg-muted/20",
        severityStyles[diff.severity],
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
        <Badge
          variant={severityBadge[diff.severity] as "destructive" | "default" | "secondary"}
          className="flex items-center gap-1.5 capitalize"
        >
          <Icon className="w-3.5 h-3.5" />
          {diff.severity}
        </Badge>
        <Badge variant="outline">{typeLabels[diff.type]}</Badge>
      </div>

      <div className="text-sm space-y-1.5 bg-background/50 rounded-md p-3 border border-border/50">
        <div className="flex items-start gap-3">
          <span className="shrink-0 mt-0.5 text-xs font-medium text-muted-foreground w-8 text-right">你的</span>
          <p className="flex-1 font-serif text-red-700 dark:text-red-300 line-through decoration-red-400/60 break-words">
            {diff.userText || "-"}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="shrink-0 mt-0.5 text-xs font-medium text-muted-foreground w-8 text-right">建议</span>
          <p className="flex-1 font-serif text-emerald-600 dark:text-emerald-400 font-medium break-words">
            {diff.suggestion || diff.original || "-"}
          </p>
        </div>
      </div>

      {diff.explanationZh && (
        <p className="text-sm text-foreground/90 leading-relaxed">{diff.explanationZh}</p>
      )}

      {hasDetails && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
            查看诊断与练习建议
            {!isExpanded && diff.drillZh && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
            )}
          </Button>

          {isExpanded && (
            <div id={detailsId} className="mt-2 space-y-3 pt-3 border-t border-border/50">
              {(diff.category || diff.rootCause) && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {diff.category && (
                    <span>错误类型: <span className="font-medium text-foreground">{categoryLabels[diff.category]}</span></span>
                  )}
                  {diff.rootCause && (
                    <span>根本原因: <span className="font-medium text-foreground">{rootCauseLabels[diff.rootCause]}</span></span>
                  )}
                </div>
              )}
              {diff.preventionTipZh && (
                <div className="text-sm bg-amber-500/10 dark:bg-amber-500/5 rounded-md px-3 py-2 border-l-2 border-amber-500/40">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-0.5">避免建议</p>
                  <p className="text-foreground/80">{diff.preventionTipZh}</p>
                </div>
              )}
              {diff.drillZh && (
                <div className="text-sm bg-sky-500/10 dark:bg-sky-500/5 rounded-md px-3 py-2 border-l-2 border-sky-500/40">
                  <p className="text-xs font-medium text-sky-700 dark:text-sky-400 mb-0.5">微练习</p>
                  <p className="text-foreground/80">{diff.drillZh}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 按原句分组的卡片 */
function DiffGroupCard({ original, diffs }: { original: string; diffs: PracticeDiffItem[] }) {
  // 组内按严重度排序
  const sortedDiffs = [...diffs].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )
  // 取组内最高严重度决定卡片边框色
  const topSeverity = sortedDiffs[0].severity

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 p-4 space-y-3 shadow-sm bg-card",
        severityStyles[topSeverity],
      )}
    >
      {/* 原句 */}
      <div className="bg-muted/40 rounded-md p-3 border border-border/50">
        <p className="text-xs font-medium text-muted-foreground mb-1">原句</p>
        <p className="text-sm font-serif leading-relaxed break-words">{original}</p>
      </div>

      {/* 错误列表 */}
      <div className="space-y-2.5">
        {sortedDiffs.map((diff, i) => (
          <DiffErrorItem key={i} diff={diff} index={i} />
        ))}
      </div>
    </div>
  )
}

export function DiffList({ diffs }: { diffs: PracticeDiffItem[] }) {
  if (diffs.length === 0) {
    return <p className="text-sm text-muted-foreground">没有发现明显差异</p>
  }

  // 按 original 分组，保持插入顺序
  const groupMap = new Map<string, PracticeDiffItem[]>()
  for (const diff of diffs) {
    const key = diff.original || ""
    const group = groupMap.get(key)
    if (group) {
      group.push(diff)
    } else {
      groupMap.set(key, [diff])
    }
  }

  // 组间按最高严重度排序
  const groups = [...groupMap.entries()].sort((a, b) => {
    const aSev = Math.min(...a[1].map((d) => severityOrder[d.severity]))
    const bSev = Math.min(...b[1].map((d) => severityOrder[d.severity]))
    return aSev - bSev
  })

  return (
    <div className="space-y-3">
      {groups.map(([original, groupDiffs], i) => (
        <DiffGroupCard key={i} original={original} diffs={groupDiffs} />
      ))}
    </div>
  )
}
