import type { PracticeMaterial } from "@/types/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, History, Trash2 } from "lucide-react"

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  })
}

interface MaterialCardProps {
  material: PracticeMaterial
  onPractice: () => void
  onViewHistory: () => void
  onDelete: () => void
}

export function MaterialCard({ material, onPractice, onViewHistory, onDelete }: MaterialCardProps) {
  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-medium line-clamp-2">{material.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>{material.wordCount} 词</span>
          <span>{formatDate(material.createdAt)}</span>
          {material.bestScore !== null && (
            <Badge variant="secondary" className="text-[10px]">
              最高 {material.bestScore} 分
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5 flex-1" onClick={onPractice}>
            <Play className="h-3.5 w-3.5" />
            开始练习
          </Button>
          {material.bestScore !== null && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onViewHistory}>
              <History className="h-3.5 w-3.5" />
              历史
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
