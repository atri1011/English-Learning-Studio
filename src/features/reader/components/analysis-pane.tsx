import { useEffect } from "react"
import { X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useReaderStore } from "@/stores/reader-store"
import { useAnalysisStore } from "@/stores/analysis-store"
import type { AnalysisType } from "@/types/db"
import type { Sentence } from "@/types/db"
import { TranslationCard } from "@/features/analysis/components/translation-card"
import { GrammarCard } from "@/features/analysis/components/grammar-card"
import { ConstituentsCard } from "@/features/analysis/components/constituents-card"
import { ExplanationCard } from "@/features/analysis/components/explanation-card"
import { ChatPanel } from "@/features/analysis/components/chat-panel"

const ALL_TYPES: AnalysisType[] = ["translation", "grammar", "constituents", "explanation"]

interface AnalysisPaneProps {
  sentence: Sentence
}

export function AnalysisPane({ sentence }: AnalysisPaneProps) {
  const { selectSentence, nextSentence, prevSentence, activeAnalysisTab, setActiveAnalysisTab } = useReaderStore()
  const { analyze, getResult, isLoading } = useAnalysisStore()

  // 改进1: 自动触发翻译
  useEffect(() => {
    const hasResult = getResult(sentence.id, "translation")
    const loading = isLoading(sentence.id, "translation")
    if (!hasResult && !loading) {
      analyze(sentence, "translation")
    }
  }, [sentence.id])

  // 改进2: 一键全分析
  const handleAnalyzeAll = () => {
    ALL_TYPES.forEach((type) => analyze(sentence, type))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h3 className="text-sm font-medium">句子分析</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleAnalyzeAll} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            全部分析
          </Button>
          <Button variant="ghost" size="sm" onClick={prevSentence}>
            上一句
          </Button>
          <Button variant="ghost" size="sm" onClick={nextSentence}>
            下一句
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => selectSentence(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Selected Sentence */}
      <div className="px-4 py-3 border-b bg-muted/50 shrink-0">
        <p className="text-sm font-serif leading-relaxed">{sentence.text}</p>
      </div>

      {/* Analysis Tabs - 改进3: 受控Tab */}
      <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 shrink-0">
          <TabsTrigger value="translation" className="text-xs">翻译</TabsTrigger>
          <TabsTrigger value="grammar" className="text-xs">语法</TabsTrigger>
          <TabsTrigger value="constituents" className="text-xs">成分</TabsTrigger>
          <TabsTrigger value="explanation" className="text-xs">讲解</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">追问</TabsTrigger>
        </TabsList>

        {activeAnalysisTab === "chat" ? (
          <TabsContent value="chat" className="flex-1 min-h-0 mt-0">
            <ChatPanel sentence={sentence} />
          </TabsContent>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              <TabsContent value="translation" className="mt-0">
                <TranslationCard sentence={sentence} />
              </TabsContent>
              <TabsContent value="grammar" className="mt-0">
                <GrammarCard sentence={sentence} />
              </TabsContent>
              <TabsContent value="constituents" className="mt-0">
                <ConstituentsCard sentence={sentence} />
              </TabsContent>
              <TabsContent value="explanation" className="mt-0">
                <ExplanationCard sentence={sentence} />
              </TabsContent>
            </div>
          </ScrollArea>
        )}
      </Tabs>
    </div>
  )
}
