import { create } from "zustand"
import { callLLM, extractJsonObjectFromText } from "@/lib/api/openai-compatible-client"
import { buildWordLookupPrompt } from "@/features/analysis/services/prompt-builder"
import { useSettingsStore } from "./settings-store"

export interface WordLookupResult {
  word: string
  phonetic: string
  pos: string
  meaningZh: string
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback
}

function normalizeWordLookupResult(raw: Record<string, unknown>, fallbackWord: string): WordLookupResult {
  return {
    word: str(raw.word, fallbackWord),
    phonetic: str(raw.phonetic),
    pos: str(raw.pos),
    meaningZh: str(raw.meaningZh),
  }
}

interface WordLookupState {
  results: Record<string, WordLookupResult>
  errors: Record<string, string>
  loadingWords: Set<string>
  lookup: (word: string, context: string) => Promise<void>
  getResult: (word: string) => WordLookupResult | undefined
  getError: (word: string) => string | undefined
  isWordLoading: (word: string) => boolean
}

export const useWordLookupStore = create<WordLookupState>()((set, get) => ({
  results: {},
  errors: {},
  loadingWords: new Set(),

  getResult: (word) => {
    return get().results[word.toLowerCase()]
  },

  getError: (word) => {
    return get().errors[word.toLowerCase()]
  },

  isWordLoading: (word) => {
    return get().loadingWords.has(word.toLowerCase())
  },

  lookup: async (word, context) => {
    const key = word.toLowerCase()
    if (get().results[key]) return
    if (get().loadingWords.has(key)) return

    // 设置 loading，清除旧错误
    set((s) => {
      const next = new Set(s.loadingWords)
      next.add(key)
      const errors = { ...s.errors }
      delete errors[key]
      return { loadingWords: next, errors }
    })

    try {
      const profile = useSettingsStore.getState().getActiveProfile()
      if (!profile) throw new Error("未配置 API，请先到设置页添加")

      const messages = buildWordLookupPrompt(word, context)

      const response = await callLLM({
        baseURL: profile.baseURL,
        apiKey: profile.apiKey,
        model: profile.model,
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
        messages,
        responseFormat: { type: "json_object" },
      })

      const parsedRaw = extractJsonObjectFromText(response.content)
      const parsed = normalizeWordLookupResult(parsedRaw, word)

      set((s) => {
        const next = new Set(s.loadingWords)
        next.delete(key)
        return {
          results: { ...s.results, [key]: parsed },
          loadingWords: next,
        }
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "查询失败"
      set((s) => {
        const next = new Set(s.loadingWords)
        next.delete(key)
        return {
          loadingWords: next,
          errors: { ...s.errors, [key]: msg },
        }
      })
    }
  },
}))
