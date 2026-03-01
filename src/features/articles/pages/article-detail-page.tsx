import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Settings, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useReaderStore } from "@/stores/reader-store"
import { useUIStore } from "@/stores/ui-store"
import { useVocabularyStore } from "@/stores/vocabulary-store"
import { useIsMobile } from "@/hooks/use-mobile"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { ReaderPane } from "@/features/reader/components/reader-pane"
import { AnalysisPane } from "@/features/reader/components/analysis-pane"
import { getArticle } from "@/features/articles/services/article-repository"
import type { Article } from "@/types/db"

export function ArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>()
  const navigate = useNavigate()
  const { loadSentences, sentences, selectedSentenceId, selectSentence, panelOpen } = useReaderStore()
  const { theme, toggleTheme } = useUIStore()
  const { loadVocabulary } = useVocabularyStore()
  const isMobile = useIsMobile()
  const [article, setArticle] = useState<Article | null>(null)

  useKeyboardNavigation()

  useEffect(() => {
    if (!articleId) return
    getArticle(articleId).then((a) => {
      if (!a) {
        navigate("/articles", { replace: true })
        return
      }
      setArticle(a)
    })
    loadSentences(articleId)
    loadVocabulary()
  }, [articleId, loadSentences, navigate, loadVocabulary])

  if (!article) return null

  const selectedSentence = sentences.find((s) => s.id === selectedSentenceId)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Reader Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b bg-background/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/articles")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-medium truncate max-w-[300px]">
              {article.title}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">
              {article.sentenceCount} 句
            </span>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Reading Content */}
        <ReaderPane />
      </div>

      {/* Analysis Panel - Desktop */}
      {panelOpen && selectedSentence && !isMobile && (
        <aside className="hidden md:flex w-96 border-l bg-card flex-col shrink-0 overflow-hidden">
          <AnalysisPane sentence={selectedSentence} />
        </aside>
      )}

      {/* Analysis Panel - Mobile Bottom Sheet */}
      {isMobile && (
        <Sheet
          open={panelOpen && !!selectedSentence}
          onOpenChange={(open) => { if (!open) selectSentence(null) }}
        >
          <SheetContent side="bottom" showCloseButton={false} className="h-[60vh] p-0">
            <SheetTitle className="sr-only">句子分析</SheetTitle>
            {selectedSentence && <AnalysisPane sentence={selectedSentence} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
