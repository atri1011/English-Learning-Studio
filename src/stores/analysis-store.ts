import { create } from "zustand"
import { db } from "@/lib/db/dexie"
import type { AnalysisResult, AnalysisType, Sentence } from "@/types/db"
import { callLLM } from "@/lib/api/openai-compatible-client"
import { buildPrompt, buildFullArticleTranslationPrompt } from "@/features/analysis/services/prompt-builder"
import { useSettingsStore } from "./settings-store"

interface AnalysisState {
  results: Record<string, AnalysisResult>
  loadingKeys: Set<string>
  getResult: (sentenceId: string, type: AnalysisType) => AnalysisResult | undefined
  isLoading: (sentenceId: string, type: AnalysisType) => boolean
  getArticleTranslationResult: (articleId: string) => AnalysisResult | undefined
  isArticleTranslationLoading: (articleId: string) => boolean
  analyzeArticleTranslation: (articleId: string, articleText: string) => Promise<void>
  loadCachedArticleTranslation: (articleId: string) => Promise<void>
  analyze: (sentence: Sentence, type: AnalysisType) => Promise<void>
  loadCachedResults: (sentenceId: string) => Promise<void>
}

function cacheKey(sentenceId: string, type: AnalysisType) {
  return `${sentenceId}:${type}`
}

const FULL_TRANSLATION_TYPE: AnalysisType = "translation"

function fullTranslationSentenceId(articleId: string) {
  return `article:${articleId}:full-translation`
}

function fullTranslationKey(articleId: string) {
  return cacheKey(fullTranslationSentenceId(articleId), FULL_TRANSLATION_TYPE)
}

export const useAnalysisStore = create<AnalysisState>()((set, get) => ({
  results: {},
  loadingKeys: new Set(),

  getResult: (sentenceId, type) => {
    return get().results[cacheKey(sentenceId, type)]
  },

  isLoading: (sentenceId, type) => {
    return get().loadingKeys.has(cacheKey(sentenceId, type))
  },

  getArticleTranslationResult: (articleId) => {
    return get().results[fullTranslationKey(articleId)]
  },

  isArticleTranslationLoading: (articleId) => {
    return get().loadingKeys.has(fullTranslationKey(articleId))
  },

  loadCachedResults: async (sentenceId) => {
    const cached = await db.analysisResults
      .where("sentenceId")
      .equals(sentenceId)
      .toArray()
    const updates: Record<string, AnalysisResult> = {}
    for (const r of cached) {
      if (r.status === "success") {
        updates[cacheKey(r.sentenceId, r.analysisType)] = r
      }
    }
    if (Object.keys(updates).length > 0) {
      set((s) => ({ results: { ...s.results, ...updates } }))
    }
  },

  loadCachedArticleTranslation: async (articleId) => {
    const sentenceId = fullTranslationSentenceId(articleId)
    const cached = await db.analysisResults
      .where("[articleId+analysisType]")
      .equals([articleId, FULL_TRANSLATION_TYPE])
      .toArray()

    const latest = cached
      .filter((r) => r.sentenceId === sentenceId && r.status === "success")
      .sort((a, b) => b.updatedAt - a.updatedAt)[0]

    if (!latest) return
    set((s) => ({ results: { ...s.results, [fullTranslationKey(articleId)]: latest } }))
  },

  analyzeArticleTranslation: async (articleId, articleText) => {
    const key = fullTranslationKey(articleId)
    if (get().loadingKeys.has(key)) return

    set((s) => {
      const next = new Set(s.loadingKeys)
      next.add(key)
      return { loadingKeys: next }
    })

    try {
      const profile = useSettingsStore.getState().getActiveProfile()
      if (!profile) throw new Error("No active API profile configured")
      if (!articleText.trim()) throw new Error("Article text is empty")

      const prompt = buildFullArticleTranslationPrompt(articleText)

      const response = await callLLM({
        baseURL: profile.baseURL,
        apiKey: profile.apiKey,
        model: profile.model,
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
        messages: prompt,
        responseFormat: { type: "json_object" },
      })

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(response.content)
      } catch {
        const match = response.content.match(/\{[\s\S]*\}/)
        if (!match) throw new Error("Failed to parse AI response as JSON")
        parsed = JSON.parse(match[0])
      }

      const sentenceId = fullTranslationSentenceId(articleId)
      const stableId = `full-translation:${articleId}`
      const now = Date.now()
      const result: AnalysisResult = {
        id: stableId,
        requestHash: `${sentenceId}:translation:${profile.model}`,
        articleId,
        sentenceId,
        analysisType: FULL_TRANSLATION_TYPE,
        status: "success",
        model: profile.model,
        resultJson: parsed,
        errorMessage: null,
        attempts: 1,
        createdAt: now,
        updatedAt: now,
      }

      await db.analysisResults.put(result)

      set((s) => {
        const next = new Set(s.loadingKeys)
        next.delete(key)
        return {
          results: { ...s.results, [key]: result },
          loadingKeys: next,
        }
      })
    } catch (err) {
      const sentenceId = fullTranslationSentenceId(articleId)
      const stableId = `full-translation:${articleId}`
      const now = Date.now()
      const errorResult: AnalysisResult = {
        id: stableId,
        requestHash: `${sentenceId}:translation:error`,
        articleId,
        sentenceId,
        analysisType: FULL_TRANSLATION_TYPE,
        status: "failed",
        model: "",
        resultJson: null,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        attempts: 1,
        createdAt: now,
        updatedAt: now,
      }

      set((s) => {
        const next = new Set(s.loadingKeys)
        next.delete(key)
        return {
          results: { ...s.results, [key]: errorResult },
          loadingKeys: next,
        }
      })
    }
  },

  analyze: async (sentence, type) => {
    const key = cacheKey(sentence.id, type)
    const existing = get().results[key]
    if (existing?.status === "success") return
    if (get().loadingKeys.has(key)) return

    set((s) => {
      const next = new Set(s.loadingKeys)
      next.add(key)
      return { loadingKeys: next }
    })

    try {
      const profile = useSettingsStore.getState().getActiveProfile()
      if (!profile) throw new Error("No active API profile configured")

      const prompt = buildPrompt(type, sentence.text)

      const response = await callLLM({
        baseURL: profile.baseURL,
        apiKey: profile.apiKey,
        model: profile.model,
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
        messages: prompt,
        responseFormat: { type: "json_object" },
      })

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(response.content)
      } catch {
        // Try to extract JSON from response
        const match = response.content.match(/\{[\s\S]*\}/)
        if (!match) throw new Error("Failed to parse AI response as JSON")
        parsed = JSON.parse(match[0])
      }

      const now = Date.now()
      const result: AnalysisResult = {
        id: crypto.randomUUID(),
        requestHash: `${sentence.id}:${type}:${profile.model}`,
        articleId: sentence.articleId,
        sentenceId: sentence.id,
        analysisType: type,
        status: "success",
        model: profile.model,
        resultJson: parsed,
        errorMessage: null,
        attempts: 1,
        createdAt: now,
        updatedAt: now,
      }

      await db.analysisResults.put(result)

      set((s) => {
        const next = new Set(s.loadingKeys)
        next.delete(key)
        return {
          results: { ...s.results, [key]: result },
          loadingKeys: next,
        }
      })
    } catch (err) {
      const now = Date.now()
      const errorResult: AnalysisResult = {
        id: crypto.randomUUID(),
        requestHash: `${sentence.id}:${type}:error`,
        articleId: sentence.articleId,
        sentenceId: sentence.id,
        analysisType: type,
        status: "failed",
        model: "",
        resultJson: null,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        attempts: 1,
        createdAt: now,
        updatedAt: now,
      }

      set((s) => {
        const next = new Set(s.loadingKeys)
        next.delete(key)
        return {
          results: { ...s.results, [key]: errorResult },
          loadingKeys: next,
        }
      })
    }
  },
}))
