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

export interface PracticeDimensionScores {
  semantic: number
  grammar: number
  lexical: number
  naturalness: number
}

export type PracticeErrorCategory = "M" | "G" | "L" | "R" | "D" | "C"

export type PracticeRootCause = "K" | "I" | "S" | "O" | "A"

export interface PracticeDualScores {
  cet46: number
  daily: number
}

export interface PracticeErrorMetrics {
  ser: number
  fer: number
  rer: number
}

export interface PracticeDiffItem {
  type: "missing" | "wrong" | "extra" | "reorder"
  severity: "critical" | "major" | "minor"
  original: string
  userText: string
  suggestion: string
  explanationZh: string
  category?: PracticeErrorCategory
  rootCause?: PracticeRootCause
  severityScore?: 1 | 3 | 5
  preventionTipZh?: string
  drillZh?: string
}

export interface PracticeMaterial {
  id: string
  title: string
  sourceText: string
  promptText: string
  wordCount: number
  bestScore: number | null
  createdAt: number
  updatedAt: number
}

export interface PracticeAttempt {
  id: string
  materialId: string
  userTranslation: string
  overallScore: number
  dimensionScores: PracticeDimensionScores
  dualScores?: PracticeDualScores
  verdictZh: string
  diffs: PracticeDiffItem[]
  errorMetrics?: PracticeErrorMetrics
  reviewPlanDays?: number[]
  betterVersion: {
    minimalEdit: string
    naturalAlt: string
  }
  strengths: string[]
  nextFocus: string[]
  model: string
  isBest: boolean
  createdAt: number
}
