import { create } from "zustand"
import { db } from "@/lib/db/dexie"
import type { AnalysisResult, AnalysisType, Sentence } from "@/types/db"
import { callLLM, extractJsonObjectFromText } from "@/lib/api/openai-compatible-client"
import { buildPrompt, buildArticleChunkTranslationPrompt } from "@/features/analysis/services/prompt-builder"
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
const ARTICLE_TRANSLATION_CHUNK_MAX_CHARS = 1800
const ARTICLE_TRANSLATION_CHUNK_CONCURRENCY = 6

function fullTranslationSentenceId(articleId: string) {
  return `article:${articleId}:full-translation`
}

function fullTranslationKey(articleId: string) {
  return cacheKey(fullTranslationSentenceId(articleId), FULL_TRANSLATION_TYPE)
}

function splitByHardLimit(text: string, maxChars: number): string[] {
  const parts: string[] = []
  for (let i = 0; i < text.length; i += maxChars) {
    parts.push(text.slice(i, i + maxChars).trim())
  }
  return parts.filter(Boolean)
}

function splitOversizedParagraph(paragraph: string, maxChars: number): string[] {
  const units = paragraph.match(/[^.!?。！？\n]+[.!?。！？]?/g)
    ?.map((s) => s.trim())
    .filter(Boolean)

  if (!units || units.length === 0) return splitByHardLimit(paragraph, maxChars)

  const parts: string[] = []
  let current = ""

  for (const unit of units) {
    if (unit.length > maxChars) {
      if (current) {
        parts.push(current.trim())
        current = ""
      }
      parts.push(...splitByHardLimit(unit, maxChars))
      continue
    }

    const candidate = current ? `${current} ${unit}` : unit
    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      if (current) parts.push(current.trim())
      current = unit
    }
  }

  if (current) parts.push(current.trim())
  return parts
}

function splitArticleIntoChunks(articleText: string, maxChars = ARTICLE_TRANSLATION_CHUNK_MAX_CHARS): string[] {
  const normalized = articleText.replace(/\r\n/g, "\n").trim()
  if (!normalized) return []

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ""

  const flushCurrent = () => {
    if (!current) return
    chunks.push(current.trim())
    current = ""
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flushCurrent()
      chunks.push(...splitOversizedParagraph(paragraph, maxChars))
      continue
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      flushCurrent()
      current = paragraph
    }
  }

  flushCurrent()
  return chunks.length > 0 ? chunks : [normalized]
}

function splitSentencesIntoChunks(sentences: Sentence[], maxChars = ARTICLE_TRANSLATION_CHUNK_MAX_CHARS): Sentence[][] {
  const filtered = sentences.filter((s) => s.text.trim().length > 0)
  if (filtered.length === 0) return []

  const chunks: Sentence[][] = []
  let current: Sentence[] = []
  let currentLength = 0

  const flushCurrent = () => {
    if (current.length === 0) return
    chunks.push(current)
    current = []
    currentLength = 0
  }

  for (const sentence of filtered) {
    const sentenceLength = sentence.text.trim().length
    if (current.length === 0) {
      current = [sentence]
      currentLength = sentenceLength
      continue
    }

    const candidateLength = currentLength + 2 + sentenceLength
    if (candidateLength <= maxChars) {
      current.push(sentence)
      currentLength = candidateLength
    } else {
      flushCurrent()
      current = [sentence]
      currentLength = sentenceLength
    }
  }

  flushCurrent()
  return chunks
}

function normalizeSentenceKey(text: string): string {
  return text.replace(/\s+/g, " ").trim()
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

      const sentences = await db.sentences
        .where("articleId")
        .equals(articleId)
        .sortBy("order")
      const sentenceChunks = splitSentencesIntoChunks(sentences)

      if (sentenceChunks.length === 0) {
        const fallbackChunks = splitArticleIntoChunks(articleText)
        if (fallbackChunks.length === 0) throw new Error("Article text is empty")
        throw new Error("当前文章句子索引为空，请重新导入文章后再试")
      }

      const translatedChunks = new Array<string>(sentenceChunks.length)
      const sentenceTranslationsById: Record<string, { translationZh: string; literalZh?: string; alignments?: Array<{ id?: number; source: string; target: string; note?: string }> }> = {}

      for (let start = 0; start < sentenceChunks.length; start += ARTICLE_TRANSLATION_CHUNK_CONCURRENCY) {
        const batch = sentenceChunks.slice(start, start + ARTICLE_TRANSLATION_CHUNK_CONCURRENCY)
        const batchTranslations = await Promise.all(
          batch.map(async (chunkSentences, offset) => {
            const chunkIndex = start + offset
            try {
              const chunkText = chunkSentences.map((s) => s.text).join("\n")
              const prompt = buildArticleChunkTranslationPrompt(
                chunkText,
                chunkIndex + 1,
                sentenceChunks.length,
                chunkSentences.map((s) => s.text),
              )
              const response = await callLLM({
                baseURL: profile.baseURL,
                apiKey: profile.apiKey,
                model: profile.model,
                temperature: profile.temperature,
                maxTokens: profile.maxTokens,
                messages: prompt,
                responseFormat: { type: "json_object" },
              })
              const parsed = extractJsonObjectFromText(response.content)

              const chunkSentenceMap: Record<string, { translationZh: string; literalZh?: string; alignments?: Array<{ id?: number; source: string; target: string; note?: string }> }> = {}
              const sourceToIndex = new Map<string, number>()
              chunkSentences.forEach((sentence, idx) => {
                sourceToIndex.set(normalizeSentenceKey(sentence.text), idx)
              })

              if (Array.isArray(parsed.sentenceTranslations)) {
                for (const item of parsed.sentenceTranslations) {
                  if (!item || typeof item !== "object") continue
                  const row = item as {
                    index?: unknown
                    source?: unknown
                    translationZh?: unknown
                    literalZh?: unknown
                    alignments?: unknown
                  }
                  const translationZh = typeof row.translationZh === "string"
                    ? row.translationZh.trim()
                    : ""
                  if (!translationZh) continue

                  let index = typeof row.index === "number"
                    ? Math.floor(row.index) - 1
                    : -1

                  if (index < 0 || index >= chunkSentences.length) {
                    const source = typeof row.source === "string"
                      ? normalizeSentenceKey(row.source)
                      : ""
                    index = source ? (sourceToIndex.get(source) ?? -1) : -1
                  }

                  if (index < 0 || index >= chunkSentences.length) continue

                  const literalZh = typeof row.literalZh === "string" ? row.literalZh.trim() || undefined : undefined
                  const alignments = Array.isArray(row.alignments)
                    ? (row.alignments as Array<{ id?: number; source: string; target: string; note?: string }>).filter(
                        (a) => a && typeof a.source === "string" && typeof a.target === "string",
                      )
                    : undefined

                  chunkSentenceMap[chunkSentences[index].id] = {
                    translationZh,
                    ...(literalZh && { literalZh }),
                    ...(alignments && alignments.length > 0 && { alignments }),
                  }
                }
              }

              const fallbackChunkTranslation = chunkSentences
                .map((s) => chunkSentenceMap[s.id]?.translationZh)
                .filter((text): text is string => typeof text === "string" && text.length > 0)
                .join("\n")

              const chunkTranslation = typeof parsed.chunkTranslationZh === "string"
                ? parsed.chunkTranslationZh.trim()
                : fallbackChunkTranslation

              if (!chunkTranslation) {
                throw new Error("Empty chunk translation")
              }
              return {
                chunkTranslation,
                chunkSentenceMap,
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Unknown error"
              throw new Error(`第 ${chunkIndex + 1}/${sentenceChunks.length} 段翻译失败: ${msg}`)
            }
          }),
        )

        batchTranslations.forEach((translation, offset) => {
          translatedChunks[start + offset] = translation.chunkTranslation
          Object.assign(sentenceTranslationsById, translation.chunkSentenceMap)
        })
      }

      const existingTranslationResults = await db.analysisResults
        .where("[articleId+analysisType]")
        .equals([articleId, FULL_TRANSLATION_TYPE])
        .toArray()

      const existingBySentence = new Map<string, AnalysisResult[]>()
      for (const record of existingTranslationResults) {
        if (record.sentenceId.startsWith("article:")) continue
        const list = existingBySentence.get(record.sentenceId) ?? []
        list.push(record)
        existingBySentence.set(record.sentenceId, list)
      }

      const now = Date.now()
      const sentenceResultsToPersist: AnalysisResult[] = []
      const sentenceResultUpdates: Record<string, AnalysisResult> = {}
      for (const sentence of sentences) {
        const richData = sentenceTranslationsById[sentence.id]
        if (!richData) continue

        const expectedRequestHash = `${sentence.id}:translation:${profile.model}`
        const existingCandidates = existingBySentence.get(sentence.id) ?? []
        const existing = existingCandidates.find((r) => r.requestHash === expectedRequestHash)
          ?? existingCandidates[0]

        const sentenceResult: AnalysisResult = {
          id: existing?.id ?? crypto.randomUUID(),
          requestHash: expectedRequestHash,
          articleId,
          sentenceId: sentence.id,
          analysisType: FULL_TRANSLATION_TYPE,
          status: "success",
          model: profile.model,
          resultJson: richData,
          errorMessage: null,
          attempts: 1,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        sentenceResultsToPersist.push(sentenceResult)
        sentenceResultUpdates[cacheKey(sentence.id, FULL_TRANSLATION_TYPE)] = sentenceResult
      }

      const parsed: Record<string, unknown> = {
        translationZh: translatedChunks.join("\n\n"),
        summaryZh: `分段翻译完成，共 ${sentenceChunks.length} 段；句子映射 ${sentenceResultsToPersist.length}/${sentences.length}`,
      }

      const sentenceId = fullTranslationSentenceId(articleId)
      const stableId = `full-translation:${articleId}`
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

      if (sentenceResultsToPersist.length > 0) {
        await db.analysisResults.bulkPut(sentenceResultsToPersist)
      }
      await db.analysisResults.put(result)

      set((s) => {
        const next = new Set(s.loadingKeys)
        next.delete(key)
        return {
          results: {
            ...s.results,
            ...sentenceResultUpdates,
            [key]: result,
          },
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

      const parsed = extractJsonObjectFromText(response.content)

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
