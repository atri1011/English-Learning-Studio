import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useArticleStore } from "@/stores/article-store"
import { ArticleCard } from "../components/article-card"
import { ArticleImportDialog } from "../components/article-import-dialog"

export function ArticlesPage() {
  const navigate = useNavigate()
  const { articles, loading, loadArticles } = useArticleStore()
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">My Articles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Import English articles and learn with AI analysis
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Article
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No articles yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Import an English article to start learning. You can paste text or upload a .txt file.
          </p>
          <Button onClick={() => setImportOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Import Your First Article
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => navigate(`/articles/${article.id}`)}
            />
          ))}
        </div>
      )}

      <ArticleImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  )
}
