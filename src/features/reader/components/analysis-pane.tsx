import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useReaderStore } from "@/stores/reader-store"
import type { Sentence } from "@/types/db"
import { TranslationCard } from "@/features/analysis/components/translation-card"
import { GrammarCard } from "@/features/analysis/components/grammar-card"
import { ConstituentsCard } from "@/features/analysis/components/constituents-card"
import { ExplanationCard } from "@/features/analysis/components/explanation-card"

interface AnalysisPaneProps {
  sentence: Sentence
}

export function AnalysisPane({ sentence }: AnalysisPaneProps) {
  const { selectSentence, nextSentence, prevSentence } = useReaderStore()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h3 className="text-sm font-medium">Sentence Analysis</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={prevSentence}>
            Prev
          </Button>
          <Button variant="ghost" size="sm" onClick={nextSentence}>
            Next
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

      {/* Analysis Tabs */}
      <Tabs defaultValue="translation" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 shrink-0">
          <TabsTrigger value="translation" className="text-xs">Translation</TabsTrigger>
          <TabsTrigger value="grammar" className="text-xs">Grammar</TabsTrigger>
          <TabsTrigger value="constituents" className="text-xs">Structure</TabsTrigger>
          <TabsTrigger value="explanation" className="text-xs">Explain</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  )
}
