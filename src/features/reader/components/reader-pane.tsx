import { useRef, useEffect, useMemo } from "react"
import { useReaderStore } from "@/stores/reader-store"
import { SentenceItem } from "./sentence-item"

export function ReaderPane() {
  const { sentences, rawText, selectedSentenceId, selectSentence, loading } = useReaderStore()
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect paragraph breaks: check if the gap between consecutive sentences contains a double newline
  const paragraphBreaks = useMemo(() => {
    if (!rawText || sentences.length < 2) return new Set<number>()
    const normalized = rawText.replace(/\r\n/g, "\n")
    const breaks = new Set<number>()
    for (let i = 1; i < sentences.length; i++) {
      const gap = normalized.slice(sentences[i - 1].charEnd, sentences[i].charStart)
      if (gap.includes("\n\n")) {
        breaks.add(i)
      }
    }
    return breaks
  }, [rawText, sentences])

  useEffect(() => {
    if (!selectedSentenceId) return
    const el = document.getElementById(`sentence-${selectedSentenceId}`)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [selectedSentenceId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading article...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[65ch] px-6 py-10">
        <div className="font-serif text-lg leading-[1.8] text-[var(--reading-fg)]"
             style={{ background: "var(--reading-bg)", margin: "-1.5rem", padding: "1.5rem", borderRadius: "0.5rem" }}>
          {sentences.map((sentence, i) => (
            <span key={sentence.id}>
              {paragraphBreaks.has(i) && <span className="block mt-4" />}
              <SentenceItem
                sentence={sentence}
                isSelected={sentence.id === selectedSentenceId}
                onSelect={() =>
                  selectSentence(
                    sentence.id === selectedSentenceId ? null : sentence.id,
                  )
                }
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
