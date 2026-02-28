import { create } from "zustand"
import type { Sentence } from "@/types/db"
import { getSentences, getArticle } from "@/features/articles/services/article-repository"

interface ReaderState {
  sentences: Sentence[]
  rawText: string
  selectedSentenceId: string | null
  panelOpen: boolean
  loading: boolean
  activeAnalysisTab: string
  loadSentences: (articleId: string) => Promise<void>
  selectSentence: (id: string | null) => void
  togglePanel: () => void
  nextSentence: () => void
  prevSentence: () => void
  setActiveAnalysisTab: (tab: string) => void
}

export const useReaderStore = create<ReaderState>()((set, get) => ({
  sentences: [],
  rawText: "",
  selectedSentenceId: null,
  panelOpen: false,
  loading: false,
  activeAnalysisTab: "translation",

  loadSentences: async (articleId) => {
    set({ loading: true, sentences: [], rawText: "", selectedSentenceId: null })
    const [sentences, article] = await Promise.all([
      getSentences(articleId),
      getArticle(articleId),
    ])
    set({ sentences, rawText: article?.rawText ?? "", loading: false })
  },

  selectSentence: (id) => {
    set({ selectedSentenceId: id, panelOpen: id !== null })
  },

  togglePanel: () => {
    set((s) => ({ panelOpen: !s.panelOpen }))
  },

  nextSentence: () => {
    const { sentences, selectedSentenceId } = get()
    if (!selectedSentenceId) {
      if (sentences.length > 0) set({ selectedSentenceId: sentences[0].id, panelOpen: true })
      return
    }
    const idx = sentences.findIndex((s) => s.id === selectedSentenceId)
    if (idx < sentences.length - 1) {
      set({ selectedSentenceId: sentences[idx + 1].id })
    }
  },

  prevSentence: () => {
    const { sentences, selectedSentenceId } = get()
    if (!selectedSentenceId) return
    const idx = sentences.findIndex((s) => s.id === selectedSentenceId)
    if (idx > 0) {
      set({ selectedSentenceId: sentences[idx - 1].id })
    }
  },

  setActiveAnalysisTab: (tab) => {
    set({ activeAnalysisTab: tab })
  },
}))
