import { Trash2, Clock, FileText } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Article } from "@/types/db"
import { useArticleStore } from "@/stores/article-store"

interface ArticleCardProps {
  article: Article
  onClick: () => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  const { removeArticle } = useArticleStore()

  const excerpt = article.rawText.slice(0, 120).trim() + (article.rawText.length > 120 ? "..." : "")

  return (
    <Card
      className="group cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {article.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm leading-relaxed mt-1.5">
          {excerpt}
        </CardDescription>
      </CardHeader>
      <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {article.wordCount} words
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(article.updatedAt)}
          </span>
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
    </Card>
  )
}
