export interface Article {
  id: string
  title: string
  rawText: string
  sourceType: "paste" | "upload" | "url" | "md"
  wordCount: number
  sentenceCount: number
  status: "draft" | "ready" | "archived"
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Sentence {
  id: string
  articleId: string
  order: number
  text: string
  charStart: number
  charEnd: number
}

export type AnalysisType = "grammar" | "constituents" | "translation" | "explanation"

export interface AnalysisResult {
  id: string
  requestHash: string
  articleId: string
  sentenceId: string
  analysisType: AnalysisType
  status: "queued" | "running" | "success" | "failed"
  model: string
  resultJson: Record<string, unknown> | null
  errorMessage: string | null
  attempts: number
  createdAt: number
  updatedAt: number
}

export interface VocabularyEntry {
  id: string
  word: string
  normalizedWord: string
  phonetic: string
  pos: string
  meaningZh: string
  context: string
  articleId: string
  sentenceId: string
  createdAt: number
}

export interface ApiProfile {
  id: string
  name: string
  baseURL: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  isActive: number
  createdAt: number
  updatedAt: number
}
