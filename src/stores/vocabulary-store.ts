import { create } from "zustand"
import type { VocabularyEntry } from "@/types/db"
import {
  getAllVocabulary,
  addVocabularyEntry as repoAdd,
  removeVocabularyEntry as repoRemove,
  removeByWord as repoRemoveByWord,
} from "@/features/vocabulary/services/vocabulary-repository"

interface VocabularyState {
  entries: VocabularyEntry[]
  loading: boolean
  savedWords: Set<string>
  loadVocabulary: () => Promise<void>
  addWord: (data: Omit<VocabularyEntry, "id" | "normalizedWord" | "createdAt">) => Promise<void>
  removeEntry: (id: string) => Promise<void>
  unsaveWord: (word: string) => Promise<void>
  isWordSaved: (word: string) => boolean
}

export const useVocabularyStore = create<VocabularyState>()((set, get) => ({
  entries: [],
  loading: false,
  savedWords: new Set(),

  loadVocabulary: async () => {
    set({ loading: true })
    const entries = await getAllVocabulary()
    const savedWords = new Set(entries.map((e) => e.normalizedWord))
    set({ entries, savedWords, loading: false })
  },

  addWord: async (data) => {
    const normalized = data.word.toLowerCase()
    if (get().savedWords.has(normalized)) return
    const entry = await repoAdd(data)
    set((s) => ({
      entries: [entry, ...s.entries],
      savedWords: new Set(s.savedWords).add(normalized),
    }))
  },

  removeEntry: async (id) => {
    const entry = get().entries.find((e) => e.id === id)
    await repoRemove(id)
    set((s) => {
      const savedWords = new Set(s.savedWords)
      if (entry) savedWords.delete(entry.normalizedWord)
      return {
        entries: s.entries.filter((e) => e.id !== id),
        savedWords,
      }
    })
  },

  unsaveWord: async (word) => {
    const normalized = word.toLowerCase()
    await repoRemoveByWord(normalized)
    set((s) => {
      const savedWords = new Set(s.savedWords)
      savedWords.delete(normalized)
      return {
        entries: s.entries.filter((e) => e.normalizedWord !== normalized),
        savedWords,
      }
    })
  },

  isWordSaved: (word) => {
    return get().savedWords.has(word.toLowerCase())
  },
}))
