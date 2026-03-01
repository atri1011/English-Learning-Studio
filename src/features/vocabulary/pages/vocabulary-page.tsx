import { useEffect, useState, useMemo } from "react"
import { BookMarked, Search, Trash2, ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useVocabularyStore } from "@/stores/vocabulary-store"
import { useArticleStore } from "@/stores/article-store"

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  })
}

export function VocabularyPage() {
  const { entries, loading, loadVocabulary, removeEntry } = useVocabularyStore()
  const { articles, loadArticles } = useArticleStore()
  const [search, setSearch] = useState("")
  const [articleFilter, setArticleFilter] = useState<string | null>(null)

  useEffect(() => {
    loadVocabulary()
    loadArticles()
  }, [loadVocabulary, loadArticles])

  const articleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of articles) {
      map.set(a.id, a.title)
    }
    return map
  }, [articles])

  const filteredEntries = useMemo(() => {
    let result = entries
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.word.toLowerCase().includes(q) ||
          e.meaningZh.includes(q),
      )
    }
    if (articleFilter) {
      result = result.filter((e) => e.articleId === articleFilter)
    }
    return result
  }, [entries, search, articleFilter])

  const articlesWithWords = useMemo(() => {
    const ids = new Set(entries.map((e) => e.articleId).filter(Boolean))
    return articles.filter((a) => ids.has(a.id))
  }, [entries, articles])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">生词本</h2>
          <p className="text-sm text-muted-foreground mt-1">
            收藏的单词，共 {entries.length} 个
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索单词或释义..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={articleFilter === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setArticleFilter(null)}
          >
            全部
          </Button>
          {articlesWithWords.map((a) => (
            <Button
              key={a.id}
              variant={articleFilter === a.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setArticleFilter(a.id)}
              className="max-w-[150px] truncate"
            >
              {a.title}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookMarked className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {search || articleFilter ? "没有找到匹配的单词" : "还没有收藏单词"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {search || articleFilter
              ? "尝试调整搜索条件或筛选条件"
              : "阅读文章时点击单词，然后点击星标收藏到生词本。"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold font-serif">
                        {entry.word}
                      </span>
                      {entry.phonetic && (
                        <span className="text-xs text-muted-foreground">
                          {entry.phonetic}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        {entry.pos}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1">{entry.meaningZh}</p>
                    {entry.context && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic font-serif">
                        "{entry.context}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {entry.articleId && articleMap.get(entry.articleId) && (
                        <Link
                          to={`/articles/${entry.articleId}`}
                          className="text-[11px] text-primary/70 hover:text-primary flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {articleMap.get(entry.articleId)}
                        </Link>
                      )}
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeEntry(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
