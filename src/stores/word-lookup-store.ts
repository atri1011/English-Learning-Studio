import { create } from "zustand"
import { callLLM } from "@/lib/api/openai-compatible-client"
import { buildWordLookupPrompt } from "@/features/analysis/services/prompt-builder"
import { useSettingsStore } from "./settings-store"

/** 从 LLM 返回内容中提取 JSON，兼容 markdown 代码块、前后缀文本等情况 */
function extractJson<T>(content: string): T {
  // 1. 直接解析
  try {
    return JSON.parse(content)
  } catch {
    // continue
  }

  // 2. 提取 markdown 代码块内的内容
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1])
    } catch {
      // continue
    }
  }

  // 3. 提取第一个完整的 {...}
  const braceMatch = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/)
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0])
    } catch {
      // continue
    }
  }

  throw new Error(`AI 返回内容无法解析: ${content.slice(0, 120)}`)
}

export interface WordLookupResult {
  word: string
  phonetic: string
  pos: string
  meaningZh: string
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

      const parsed = extractJson<WordLookupResult>(response.content)

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
