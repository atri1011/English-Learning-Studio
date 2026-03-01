import { Trash2, Clock, FileText } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Article } from "@/types/db"
import { useArticleStore } from "@/stores/article-store"

interface ArticleCardProps {
  article: Article
  onClick: () => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  const { removeArticle, getProgress } = useArticleStore()
  const progress = getProgress(article.id)
  const percent = progress && progress.total > 0
    ? Math.round((progress.analyzed / progress.total) * 100)
    : 0

  const excerpt = article.rawText.slice(0, 120).trim() + (article.rawText.length > 120 ? "..." : "")

  return (
    <Card
      className="group cursor-pointer transition-shadow hover:shadow-md relative overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {article.title}
        </CardTitle>
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <CardDescription className="line-clamp-2 text-sm leading-relaxed mt-1.5">
          {excerpt}
        </CardDescription>
      </CardHeader>
      <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {article.wordCount} 词
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(article.updatedAt)}
          </span>
          {progress && progress.analyzed > 0 && (
            <span className="text-primary/70">
              {progress.analyzed}/{progress.total} 句
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            removeArticle(article.id)
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </CardFooter>

      {/* Progress bar */}
      {percent > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-muted">
            <div
              className="h-full bg-primary/60 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
