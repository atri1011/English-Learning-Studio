import { useEffect, useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Plus, BookOpen, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useArticleStore } from "@/stores/article-store"
import { useSettingsStore } from "@/stores/settings-store"
import { ArticleCard } from "../components/article-card"
import { ArticleImportDialog } from "../components/article-import-dialog"

export function ArticlesPage() {
  const navigate = useNavigate()
  const { articles, loading, loadArticles, tagFilter, setTagFilter, getAllTags } = useArticleStore()
  const { profiles, loadProfiles } = useSettingsStore()
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    loadArticles()
    loadProfiles()
  }, [loadArticles, loadProfiles])

  const hasApiProfile = profiles.length > 0
  const allTags = getAllTags()

  const filteredArticles = useMemo(() => {
    if (!tagFilter) return articles
    return articles.filter((a) => a.tags?.includes(tagFilter))
  }, [articles, tagFilter])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">我的文章</h2>
          <p className="text-sm text-muted-foreground mt-1">
            导入英文文章，借助 AI 逐句分析学习
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          添加文章
        </Button>
      </div>

      {/* Tag Filter Bar */}
      {allTags.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <Button
            variant={tagFilter === null ? "secondary" : "ghost"}
            size="sm"
            className="shrink-0"
            onClick={() => setTagFilter(null)}
          >
            全部
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={tagFilter === tag ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

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
          <h3 className="text-lg font-medium mb-2">还没有文章</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            导入一篇英文文章开始学习，支持粘贴文本、上传文件或 URL 导入。
          </p>
          {!hasApiProfile && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 mb-4 max-w-sm">
              <p className="text-sm font-medium mb-2">需要先完成配置</p>
              <p className="text-xs text-muted-foreground mb-3">
                请先配置 AI API，才能使用句子分析功能。
              </p>
              <Link to="/settings">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  前往设置
                </Button>
              </Link>
            </div>
          )}
          <Button onClick={() => setImportOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            导入第一篇文章
          </Button>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">没有标签为 "{tagFilter}" 的文章</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTagFilter(null)}>
            查看全部
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article) => (
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
