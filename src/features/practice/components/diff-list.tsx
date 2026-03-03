import type { PracticeDiffItem } from "@/types/db"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const typeLabels: Record<PracticeDiffItem["type"], string> = {
  missing: "缺失",
  wrong: "错误",
  extra: "多余",
  reorder: "语序",
}

const severityStyles: Record<PracticeDiffItem["severity"], string> = {
  critical: "border-red-500/50 bg-red-500/5",
  major: "border-yellow-500/50 bg-yellow-500/5",
  minor: "border-blue-500/50 bg-blue-500/5",
}

const severityBadge: Record<PracticeDiffItem["severity"], string> = {
  critical: "destructive",
  major: "default",
  minor: "secondary",
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

export function DiffList({ diffs }: { diffs: PracticeDiffItem[] }) {
  if (diffs.length === 0) {
    return <p className="text-sm text-muted-foreground">没有发现明显差异</p>
  }

  return (
    <div className="space-y-3">
      {diffs.map((diff, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg border p-3 space-y-2",
            severityStyles[diff.severity],
          )}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={severityBadge[diff.severity] as "destructive" | "default" | "secondary"}>
              {diff.severity}
            </Badge>
            <Badge variant="outline">{typeLabels[diff.type]}</Badge>
            {diff.category && <Badge variant="outline">{categoryLabels[diff.category]}</Badge>}
            {diff.rootCause && <Badge variant="secondary">{rootCauseLabels[diff.rootCause]}</Badge>}
            {typeof diff.severityScore === "number" && (
              <Badge variant="outline">严重度 {diff.severityScore}</Badge>
            )}
          </div>
          <div className="text-sm space-y-1.5">
            {/* 你的翻译 - 红色标记错误 */}
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 text-xs font-medium text-red-600 dark:text-red-400 w-6 text-center">-</span>
              <div className="flex-1 rounded-md bg-red-500/10 px-2.5 py-1.5 border border-red-500/20">
                <p className="font-serif text-red-700 dark:text-red-300 line-through decoration-red-400/60">
                  {diff.userText || "-"}
                </p>
              </div>
            </div>
            {/* 原文/建议 - 绿色标记正确 */}
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 text-xs font-medium text-green-600 dark:text-green-400 w-6 text-center">+</span>
              <div className="flex-1 rounded-md bg-green-500/10 px-2.5 py-1.5 border border-green-500/20">
                <p className="font-serif text-green-700 dark:text-green-300">
                  {diff.suggestion || diff.original || "-"}
                </p>
                {diff.suggestion && diff.original && diff.suggestion !== diff.original && (
                  <p className="font-serif text-xs text-muted-foreground mt-1">
                    原文: {diff.original}
                  </p>
                )}
              </div>
            </div>
          </div>
          {diff.explanationZh && (
            <div className="text-sm bg-muted/60 rounded-md px-3 py-2 border-l-2 border-primary/40">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">原因</p>
              <p className="text-foreground/80">{diff.explanationZh}</p>
            </div>
          )}
          {diff.preventionTipZh && (
            <div className="text-sm bg-muted/40 rounded-md px-3 py-2 border-l-2 border-emerald-500/40">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">避免建议</p>
              <p className="text-foreground/80">{diff.preventionTipZh}</p>
            </div>
          )}
          {diff.drillZh && (
            <div className="text-sm bg-muted/40 rounded-md px-3 py-2 border-l-2 border-sky-500/40">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">微练习</p>
              <p className="text-foreground/80">{diff.drillZh}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
