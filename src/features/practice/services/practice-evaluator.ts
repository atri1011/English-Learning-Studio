import { callLLM, extractJsonObjectFromText } from "@/lib/api/openai-compatible-client"
import { buildBackTranslationEvalPrompt } from "./practice-prompt-builder"
import type {
  PracticeDimensionScores,
  PracticeDiffItem,
  PracticeDualScores,
  PracticeErrorMetrics,
  PracticeErrorCategory,
  PracticeRootCause,
} from "@/types/db"

interface ApiProfile {
  baseURL: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

interface ChunkEvalResult {
  overallScore: number
  dimensionScores: PracticeDimensionScores
  dualScores: PracticeDualScores
  verdictZh: string
  diffs: PracticeDiffItem[]
  errorMetrics: PracticeErrorMetrics
  reviewPlanDays: number[]
  betterVersion: {
    minimalEdit: string
    naturalAlt: string
  }
  strengths: string[]
  nextFocus: string[]
}

export interface PracticeEvalResult {
  overallScore: number
  dimensionScores: PracticeDimensionScores
  dualScores: PracticeDualScores
  verdictZh: string
  diffs: PracticeDiffItem[]
  errorMetrics: PracticeErrorMetrics
  reviewPlanDays: number[]
  betterVersion: {
    minimalEdit: string
    naturalAlt: string
  }
  strengths: string[]
  nextFocus: string[]
}

const MIN_CHUNK_WORDS = 50
const CONCURRENCY_LIMIT = 2

const OVERALL_SCORE_ALIASES = [
  "overallScore",
  "overall",
  "totalScore",
  "finalScore",
  "score",
  "总分",
  "综合得分",
  "分数",
] as const

const DIMENSION_SCORES_ALIASES = [
  "dimensionScores",
  "dimensions",
  "scores",
  "scoreBreakdown",
  "subScores",
  "四维评分",
  "维度评分",
] as const

const VERDICT_ALIASES = [
  "verdictZh",
  "verdict",
  "summary",
  "overallComment",
  "comment",
  "总评",
  "评语",
  "总结",
] as const

const DIFFS_ALIASES = [
  "diffs",
  "diff",
  "errors",
  "errorAnalysis",
  "error_analysis",
  "mistakes",
  "issues",
  "错误分析",
  "问题",
] as const

const BETTER_VERSION_ALIASES = [
  "betterVersion",
  "improvedVersion",
  "revisedVersion",
  "revision",
  "修正版本",
  "优化版本",
] as const

const MINIMAL_EDIT_ALIASES = [
  "minimalEdit",
  "minimalCorrection",
  "correctedText",
  "revisedText",
  "最小修正版",
  "修正版",
] as const

const NATURAL_ALT_ALIASES = [
  "naturalAlt",
  "naturalVersion",
  "fluentVersion",
  "idiomaticVersion",
  "更自然的表达",
  "地道表达",
] as const

const STRENGTHS_ALIASES = [
  "strengths",
  "goodPoints",
  "highlights",
  "advantages",
  "优点",
  "做得好",
] as const

const NEXT_FOCUS_ALIASES = [
  "nextFocus",
  "improvements",
  "weakPoints",
  "tips",
  "建议",
  "下次注意",
  "改进点",
] as const

const DUAL_SCORES_ALIASES = [
  "dualScores",
  "scorecards",
  "scoreCard",
  "双评分",
  "双轨评分",
] as const

const CET46_SCORE_ALIASES = ["cet46", "exam", "cet", "cet4", "cet6", "四六级"] as const
const DAILY_SCORE_ALIASES = ["daily", "practical", "dailyUse", "实用分", "日常"] as const

const ERROR_METRICS_ALIASES = [
  "errorMetrics",
  "metrics",
  "rates",
  "错误率",
] as const
const SER_ALIASES = ["ser", "semanticErrorRate", "semanticRate", "语义错误率"] as const
const FER_ALIASES = ["fer", "formErrorRate", "formRate", "形式错误率"] as const
const RER_ALIASES = ["rer", "recurringErrorRate", "repeatRate", "重复错误率"] as const

const REVIEW_PLAN_ALIASES = [
  "reviewPlanDays",
  "reviewDays",
  "reviewSchedule",
  "复测计划",
  "复习天数",
] as const

const SEMANTIC_SCORE_ALIASES = [
  "semantic",
  "semantics",
  "meaning",
  "accuracy",
  "semanticAccuracy",
  "meaningAccuracy",
  "语义",
  "语义准确度",
  "准确度",
] as const

const GRAMMAR_SCORE_ALIASES = [
  "grammar",
  "grammaticality",
  "syntax",
  "grammarCorrectness",
  "语法",
  "语法正确性",
] as const

const LEXICAL_SCORE_ALIASES = [
  "lexical",
  "vocabulary",
  "wordChoice",
  "lexicon",
  "词汇",
  "词汇运用",
] as const

const NATURALNESS_SCORE_ALIASES = [
  "naturalness",
  "fluency",
  "idiomaticity",
  "nativeLike",
  "expression",
  "自然度",
  "流畅度",
  "地道度",
] as const

const SCORE_VALUE_ALIASES = ["score", "value", "分数", "得分"] as const

const DIFF_TYPE_ALIASES = ["type", "errorType", "kind", "错误类型", "类型"] as const
const DIFF_SEVERITY_ALIASES = ["severity", "level", "priority", "严重程度", "级别"] as const
const DIFF_SEVERITY_SCORE_ALIASES = ["severityScore", "score", "weight", "严重度分"] as const
const DIFF_CATEGORY_ALIASES = ["category", "errorCategory", "tag", "错误分类", "标签"] as const
const DIFF_ROOT_CAUSE_ALIASES = ["rootCause", "cause", "reasonType", "根因", "原因类型"] as const
const DIFF_ORIGINAL_ALIASES = ["original", "source", "sourceText", "原文"] as const
const DIFF_USER_TEXT_ALIASES = ["userText", "user", "studentText", "backTranslation", "你的翻译", "学生翻译"] as const
const DIFF_SUGGESTION_ALIASES = ["suggestion", "correction", "rewrite", "建议修改", "建议"] as const
const DIFF_EXPLANATION_ALIASES = ["explanationZh", "explanation", "reason", "analysis", "中文解释", "原因", "解释"] as const
const DIFF_PREVENTION_TIP_ALIASES = ["preventionTipZh", "preventionTip", "antiPatternTip", "避免建议"] as const
const DIFF_DRILL_ALIASES = ["drillZh", "microDrill", "practiceDrill", "微练习"] as const

const LIST_CONTAINER_ALIASES = ["items", "list", "rows", "errors", "diffs", "mistakes"] as const
const FEEDBACK_ALIASES = ["feedback", "comments", "advice", "评语", "反馈"] as const

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function splitTextIntoChunks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) return []

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  if (paragraphs.length <= 1) return [normalized]

  const chunks: string[] = []
  let current = ""

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph
      continue
    }

    if (countWords(current) < MIN_CHUNK_WORDS) {
      current = `${current}\n\n${paragraph}`
      continue
    }

    chunks.push(current)
    current = paragraph
  }

  if (current) {
    if (chunks.length > 0 && countWords(current) < MIN_CHUNK_WORDS) {
      chunks[chunks.length - 1] += `\n\n${current}`
    } else {
      chunks.push(current)
    }
  }

  return chunks
}

export function alignChunks(sourceChunks: string[], targetText: string): string[] {
  const n = sourceChunks.length
  if (n <= 1) return [targetText.trim()]

  const normalized = targetText.replace(/\r\n/g, "\n").trim()
  const totalLen = normalized.length
  const avgLen = Math.floor(totalLen / n)

  const result: string[] = []
  let pos = 0

  for (let i = 0; i < n - 1; i++) {
    const target = pos + avgLen
    if (target >= totalLen) break

    const searchRange = Math.min(Math.floor(avgLen * 0.3), 100)
    let bestBreak = target

    for (let offset = 0; offset <= searchRange; offset++) {
      if (target + offset < totalLen && normalized[target + offset] === "\n") {
        bestBreak = target + offset + 1
        break
      }
      if (target - offset > pos && normalized[target - offset] === "\n") {
        bestBreak = target - offset + 1
        break
      }
    }

    if (bestBreak === target) {
      const sentenceEnders = /[。！？.!?]/
      for (let offset = 0; offset <= searchRange; offset++) {
        if (target + offset < totalLen && sentenceEnders.test(normalized[target + offset])) {
          bestBreak = target + offset + 1
          break
        }
        if (target - offset > pos && sentenceEnders.test(normalized[target - offset])) {
          bestBreak = target - offset + 1
          break
        }
      }
    }

    result.push(normalized.slice(pos, bestBreak).trim())
    pos = bestBreak
  }

  if (pos < totalLen) {
    result.push(normalized.slice(pos).trim())
  }

  while (result.length < n) {
    result.push("")
  }

  return result.slice(0, n)
}

function clampScore(value: unknown): number {
  const num = toNumber(value)
  if (num === null) return 0
  const normalized = num > 0 && num <= 1 ? num * 100 : num
  return Math.max(0, Math.min(100, Math.round(normalized)))
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const matched = value.trim().replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)
  if (!matched) return null
  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : null
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeKey(key: string): string {
  return key.replace(/[\s_\-:：]/g, "").toLowerCase()
}

function getAliasedValue(source: Record<string, unknown>, aliases: readonly string[]): unknown {
  const aliasSet = new Set(aliases.map(normalizeKey))
  for (const [key, value] of Object.entries(source)) {
    if (aliasSet.has(normalizeKey(key))) return value
  }
  return undefined
}

function getFromPrimaryOrFallback(
  primary: Record<string, unknown> | null,
  fallback: Record<string, unknown>,
  aliases: readonly string[],
): unknown {
  if (primary) {
    const value = getAliasedValue(primary, aliases)
    if (value !== undefined) return value
  }
  return getAliasedValue(fallback, aliases)
}

function hasAliasedKey(source: Record<string, unknown>, aliases: readonly string[]): boolean {
  return getAliasedValue(source, aliases) !== undefined
}

function getNestedScore(source: Record<string, unknown>, aliases: readonly string[]): number {
  const raw = getAliasedValue(source, aliases)
  if (raw === undefined) return 0
  const nested = toRecord(raw)
  if (nested) {
    const nestedScore = getAliasedValue(nested, SCORE_VALUE_ALIASES)
    if (nestedScore !== undefined) return clampScore(nestedScore)
  }
  return clampScore(raw)
}

function maybeScaleFromTen(scores: PracticeDimensionScores): PracticeDimensionScores {
  const values = Object.values(scores).filter((v) => v > 0)
  if (values.length === 0) return scores
  const max = Math.max(...values)
  if (max > 10) return scores

  return {
    semantic: clampScore(scores.semantic * 10),
    grammar: clampScore(scores.grammar * 10),
    lexical: clampScore(scores.lexical * 10),
    naturalness: clampScore(scores.naturalness * 10),
  }
}

const SEVERITY_SCORE_MAP: Record<PracticeDiffItem["severity"], 1 | 3 | 5> = {
  critical: 5,
  major: 3,
  minor: 1,
}

function normalizeDiffType(value: unknown): PracticeDiffItem["type"] {
  const key = normalizeKey(normalizeString(value))
  if (["missing", "omit", "omission", "缺失", "遗漏", "漏译"].includes(key)) return "missing"
  if (["extra", "addition", "redundant", "多余", "冗余"].includes(key)) return "extra"
  if (["reorder", "wordorder", "order", "语序", "顺序"].includes(key)) return "reorder"
  return "wrong"
}

function normalizeSeverity(value: unknown): PracticeDiffItem["severity"] {
  const key = normalizeKey(normalizeString(value))
  if (["critical", "severe", "high", "严重", "致命"].includes(key)) return "critical"
  if (["minor", "low", "轻微", "较轻"].includes(key)) return "minor"
  return "major"
}

function normalizeSeverityScore(
  value: unknown,
  fallbackSeverity: PracticeDiffItem["severity"],
): 1 | 3 | 5 {
  const numeric = toNumber(value)
  if (numeric !== null) {
    if (numeric >= 4) return 5
    if (numeric <= 1.5) return 1
    return 3
  }
  return SEVERITY_SCORE_MAP[fallbackSeverity]
}

function normalizeErrorCategory(value: unknown): PracticeErrorCategory | undefined {
  const key = normalizeKey(normalizeString(value))
  if (!key) return undefined
  if (["m", "semantic", "meaning", "语义"].includes(key)) return "M"
  if (["g", "grammar", "syntax", "语法"].includes(key)) return "G"
  if (["l", "lexical", "vocabulary", "collocation", "词汇", "搭配"].includes(key)) return "L"
  if (["r", "register", "style", "语域", "语体"].includes(key)) return "R"
  if (["d", "discourse", "cohesion", "篇章", "衔接"].includes(key)) return "D"
  if (["c", "constraint", "requirement", "任务约束", "约束"].includes(key)) return "C"
  return undefined
}

function inferErrorCategory(
  type: PracticeDiffItem["type"],
  explanationZh: string,
): PracticeErrorCategory {
  const key = normalizeKey(explanationZh)
  if (key.includes("语法") || key.includes("时态") || key.includes("从句") || key.includes("主谓")) {
    return "G"
  }
  if (key.includes("搭配") || key.includes("介词") || key.includes("词汇")) {
    return "L"
  }
  if (key.includes("语域") || key.includes("正式") || key.includes("口语")) {
    return "R"
  }
  if (key.includes("衔接") || key.includes("指代") || key.includes("篇章")) {
    return "D"
  }
  if (key.includes("要求") || key.includes("关键词") || key.includes("字数")) {
    return "C"
  }
  if (type === "reorder") return "G"
  return "M"
}

function normalizeRootCause(value: unknown): PracticeRootCause | undefined {
  const key = normalizeKey(normalizeString(value))
  if (!key) return undefined
  if (["k", "knowledgegap", "knowledge", "知识缺口"].includes(key)) return "K"
  if (["i", "l1transfer", "interference", "迁移干扰", "母语迁移"].includes(key)) return "I"
  if (["s", "retrievalfailure", "recallfailure", "检索失败", "想不起来"].includes(key)) return "S"
  if (["o", "overgeneralization", "过度泛化"].includes(key)) return "O"
  if (["a", "attention", "careless", "粗心", "注意力失误"].includes(key)) return "A"
  return undefined
}

function inferRootCause(explanationZh: string): PracticeRootCause {
  const key = normalizeKey(explanationZh)
  if (key.includes("规则") || key.includes("不会") || key.includes("不熟")) return "K"
  if (key.includes("中文") || key.includes("直译") || key.includes("母语")) return "I"
  if (key.includes("一时") || key.includes("想不起来") || key.includes("临场")) return "S"
  if (key.includes("过度") || key.includes("套用")) return "O"
  return "A"
}

function parseReviewPlanDays(value: unknown): number[] {
  if (Array.isArray(value)) {
    const days = value
      .map((item) => toNumber(item))
      .filter((n): n is number => n !== null)
      .map((n) => Math.max(1, Math.round(n)))
    return [...new Set(days)].sort((a, b) => a - b)
  }
  if (typeof value === "string") {
    const days = value
      .split(/[,\s，;；]+/)
      .map((part) => toNumber(part))
      .filter((n): n is number => n !== null)
      .map((n) => Math.max(1, Math.round(n)))
    return [...new Set(days)].sort((a, b) => a - b)
  }
  return []
}

function sumSeverityByCategory(
  diffs: PracticeDiffItem[],
  categories: readonly PracticeErrorCategory[],
): number {
  return diffs.reduce((total, diff) => {
    if (!diff.category || !categories.includes(diff.category)) return total
    return total + (diff.severityScore ?? SEVERITY_SCORE_MAP[diff.severity])
  }, 0)
}

function calculateDualScores(
  dimensionScores: PracticeDimensionScores,
  diffs: PracticeDiffItem[],
): PracticeDualScores {
  const hasDimensionSignal =
    dimensionScores.semantic > 0 ||
    dimensionScores.grammar > 0 ||
    dimensionScores.lexical > 0 ||
    dimensionScores.naturalness > 0
  if (!hasDimensionSignal && diffs.length === 0) {
    return { cet46: 0, daily: 0 }
  }

  const constraintPenalty = sumSeverityByCategory(diffs, ["C"])
  const discoursePenalty = sumSeverityByCategory(diffs, ["D"])
  const constraintScore = clampScore(100 - constraintPenalty * 8)
  const discourseScore = clampScore(100 - discoursePenalty * 6)

  const cet46 = Math.round(
    dimensionScores.semantic * 0.4 +
    dimensionScores.grammar * 0.3 +
    dimensionScores.lexical * 0.15 +
    dimensionScores.naturalness * 0.1 +
    constraintScore * 0.05,
  )

  const daily = Math.round(
    dimensionScores.semantic * 0.3 +
    dimensionScores.lexical * 0.25 +
    dimensionScores.naturalness * 0.2 +
    discourseScore * 0.15 +
    dimensionScores.grammar * 0.1,
  )

  return {
    cet46: clampScore(cet46),
    daily: clampScore(daily),
  }
}

function calculateErrorMetrics(diffs: PracticeDiffItem[]): Pick<PracticeErrorMetrics, "ser" | "fer"> {
  if (diffs.length === 0) return { ser: 0, fer: 0 }

  const semanticCategories: PracticeErrorCategory[] = ["M", "D", "C"]
  const formCategories: PracticeErrorCategory[] = ["G", "L", "R"]

  let semanticWeight = sumSeverityByCategory(diffs, semanticCategories)
  let formWeight = sumSeverityByCategory(diffs, formCategories)

  if (semanticWeight === 0 && formWeight === 0) {
    semanticWeight = diffs
      .filter((d) => d.type === "missing" || d.type === "wrong" || d.type === "extra")
      .reduce((sum, d) => sum + (d.severityScore ?? SEVERITY_SCORE_MAP[d.severity]), 0)
    formWeight = diffs
      .filter((d) => d.type === "reorder")
      .reduce((sum, d) => sum + (d.severityScore ?? SEVERITY_SCORE_MAP[d.severity]), 0)
  }

  const total = semanticWeight + formWeight
  if (total <= 0) return { ser: 0, fer: 0 }

  const ser = Math.round((semanticWeight / total) * 100)
  const fer = Math.max(0, Math.min(100, 100 - ser))
  return { ser, fer }
}

function calculateReviewPlanDays(diffs: PracticeDiffItem[]): number[] {
  if (diffs.length === 0) return [3, 7]
  const maxSeverity = diffs.reduce(
    (max, diff) => Math.max(max, diff.severityScore ?? SEVERITY_SCORE_MAP[diff.severity]),
    1,
  )
  if (maxSeverity >= 5) return [1, 3, 7, 14]
  if (maxSeverity >= 3) return [1, 3, 7]
  return [3, 7, 14]
}

function hasEvalSignal(source: Record<string, unknown>): boolean {
  return (
    hasAliasedKey(source, OVERALL_SCORE_ALIASES) ||
    hasAliasedKey(source, DIMENSION_SCORES_ALIASES) ||
    hasAliasedKey(source, DIFFS_ALIASES) ||
    hasAliasedKey(source, VERDICT_ALIASES) ||
    hasAliasedKey(source, DUAL_SCORES_ALIASES) ||
    hasAliasedKey(source, ERROR_METRICS_ALIASES)
  )
}

function tryParseRecordFromString(value: string): Record<string, unknown> | null {
  const trimmed = value.trim()
  if (!trimmed || !trimmed.includes("{")) return null

  try {
    return extractJsonObjectFromText(trimmed)
  } catch {
    return null
  }
}

function resolveEvalRoot(input: Record<string, unknown>): Record<string, unknown> {
  const queue: unknown[] = [input]
  const visited = new Set<object>()

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined || current === null) continue

    if (typeof current === "string") {
      const parsed = tryParseRecordFromString(current)
      if (parsed) queue.push(parsed)
      continue
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item)
      continue
    }

    const record = toRecord(current)
    if (!record) continue
    if (visited.has(record)) continue
    visited.add(record)

    if (hasEvalSignal(record)) return record
    for (const nested of Object.values(record)) {
      queue.push(nested)
    }
  }

  return input
}

function normalizeDiffList(value: unknown): PracticeDiffItem[] {
  if (Array.isArray(value)) {
    return value.map(normalizeDiffItem).filter((d): d is PracticeDiffItem => d !== null)
  }

  const container = toRecord(value)
  if (!container) return []

  for (const alias of LIST_CONTAINER_ALIASES) {
    const nested = getAliasedValue(container, [alias])
    if (Array.isArray(nested)) {
      return nested.map(normalizeDiffItem).filter((d): d is PracticeDiffItem => d !== null)
    }
  }

  return []
}

function isEmptyEval(result: ChunkEvalResult): boolean {
  const { dimensionScores, betterVersion } = result
  return (
    result.overallScore === 0 &&
    dimensionScores.semantic === 0 &&
    dimensionScores.grammar === 0 &&
    dimensionScores.lexical === 0 &&
    dimensionScores.naturalness === 0 &&
    !result.verdictZh &&
    result.diffs.length === 0 &&
    !betterVersion.minimalEdit &&
    !betterVersion.naturalAlt &&
    result.strengths.length === 0 &&
    result.nextFocus.length === 0
  )
}

function parseEvalAttempt(content: string): {
  parsed: Record<string, unknown> | null
  normalized: ChunkEvalResult | null
} {
  try {
    const parsed = extractJsonObjectFromText(content)
    return { parsed, normalized: normalizePracticeEval(parsed) }
  } catch {
    return { parsed: null, normalized: null }
  }
}

function isLikelyProviderErrorPayload(parsed: Record<string, unknown>): {
  isProviderError: boolean
  code: string
  message: string
} {
  const code = normalizeString(parsed.code).trim()
  const message =
    normalizeString(parsed.message).trim() ||
    normalizeString(parsed.msg).trim() ||
    normalizeString(parsed.error).trim()
  const status = normalizeString(parsed.status).trim().toLowerCase()

  const hasStructuredError = message.length > 0 && (code.length > 0 || status === "error")
  const genericCodePattern = /^(?:[45]\d{2}|[a-z_][a-z0-9_-]{1,31})$/i
  const codeLooksLikeErrorCode = code.length > 0 && genericCodePattern.test(code)

  return {
    isProviderError: hasStructuredError || (codeLooksLikeErrorCode && status === "error"),
    code,
    message,
  }
}

function buildRepairMessages(
  baseMessages: ChatMessage[],
  previousContent: string,
): ChatMessage[] {
  return [
    ...baseMessages,
    {
      role: "assistant",
      content: previousContent.slice(0, 2000),
    },
    {
      role: "user",
      content:
        "你上一条输出不符合要求。请严格只返回一个 JSON 对象，且必须包含：overallScore、dimensionScores(semantic/grammar/lexical/naturalness)、dualScores(cet46/daily)、diffs(含category/rootCause/severityScore)、errorMetrics(ser/fer)、reviewPlanDays、betterVersion(minimalEdit/naturalAlt)、strengths、nextFocus、verdictZh。不要返回代码，不要返回解释文本，不要用 markdown。",
    },
  ]
}

function normalizeString(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function normalizeStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/\r?\n|[；;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeString(item)).filter(Boolean)
}

function normalizeDiffItem(raw: unknown): PracticeDiffItem | null {
  const item = toRecord(raw)
  if (!item) return null

  const type = normalizeDiffType(getAliasedValue(item, DIFF_TYPE_ALIASES))
  const severity = normalizeSeverity(getAliasedValue(item, DIFF_SEVERITY_ALIASES))
  const severityScore = normalizeSeverityScore(
    getAliasedValue(item, DIFF_SEVERITY_SCORE_ALIASES),
    severity,
  )
  const original = normalizeString(getAliasedValue(item, DIFF_ORIGINAL_ALIASES))
  const userText = normalizeString(getAliasedValue(item, DIFF_USER_TEXT_ALIASES))
  const suggestion = normalizeString(getAliasedValue(item, DIFF_SUGGESTION_ALIASES))
  const explanationZh = normalizeString(getAliasedValue(item, DIFF_EXPLANATION_ALIASES))
  const category =
    normalizeErrorCategory(getAliasedValue(item, DIFF_CATEGORY_ALIASES)) ||
    inferErrorCategory(type, explanationZh)
  const rootCause =
    normalizeRootCause(getAliasedValue(item, DIFF_ROOT_CAUSE_ALIASES)) ||
    inferRootCause(explanationZh)
  const preventionTipZh = normalizeString(getAliasedValue(item, DIFF_PREVENTION_TIP_ALIASES))
  const drillZh = normalizeString(getAliasedValue(item, DIFF_DRILL_ALIASES))

  if (!original && !userText && !suggestion && !explanationZh && !preventionTipZh && !drillZh) return null

  return {
    type,
    severity,
    severityScore,
    category,
    rootCause,
    original,
    userText,
    suggestion,
    explanationZh,
    preventionTipZh,
    drillZh,
  }
}

export function normalizePracticeEval(input: Record<string, unknown>): ChunkEvalResult {
  const raw = resolveEvalRoot(input)
  const dimensionSource = toRecord(getAliasedValue(raw, DIMENSION_SCORES_ALIASES))
  const ds = dimensionSource ?? raw

  const dimensionScores = maybeScaleFromTen({
    semantic: getNestedScore(ds, SEMANTIC_SCORE_ALIASES),
    grammar: getNestedScore(ds, GRAMMAR_SCORE_ALIASES),
    lexical: getNestedScore(ds, LEXICAL_SCORE_ALIASES),
    naturalness: getNestedScore(ds, NATURALNESS_SCORE_ALIASES),
  })

  const overallRaw = getAliasedValue(raw, OVERALL_SCORE_ALIASES)
  const overallNumber = overallRaw === undefined ? null : toNumber(overallRaw)
  const weightedOverall = Math.round(
    dimensionScores.semantic * 0.4 +
    dimensionScores.grammar * 0.25 +
    dimensionScores.lexical * 0.2 +
    dimensionScores.naturalness * 0.15,
  )
  const overallScore = overallNumber === null ? weightedOverall : clampScore(overallNumber)

  const feedback = toRecord(getAliasedValue(raw, FEEDBACK_ALIASES))
  const betterVersion = toRecord(getAliasedValue(raw, BETTER_VERSION_ALIASES))
  const dualSource = toRecord(getAliasedValue(raw, DUAL_SCORES_ALIASES))
  const metricsSource = toRecord(getAliasedValue(raw, ERROR_METRICS_ALIASES))

  const diffs = normalizeDiffList(getAliasedValue(raw, DIFFS_ALIASES))
  const verdictZh =
    normalizeString(getAliasedValue(raw, VERDICT_ALIASES)) ||
    normalizeString(feedback ? getAliasedValue(feedback, VERDICT_ALIASES) : undefined)
  const strengths = normalizeStringArray(
    getFromPrimaryOrFallback(feedback, raw, STRENGTHS_ALIASES),
  )
  const nextFocus = normalizeStringArray(
    getFromPrimaryOrFallback(feedback, raw, NEXT_FOCUS_ALIASES),
  )
  const minimalEdit = normalizeString(
    getFromPrimaryOrFallback(betterVersion, raw, MINIMAL_EDIT_ALIASES),
  )
  const naturalAlt = normalizeString(
    getFromPrimaryOrFallback(betterVersion, raw, NATURAL_ALT_ALIASES),
  )

  const fallbackDualScores = calculateDualScores(dimensionScores, diffs)
  const dualScores: PracticeDualScores = {
    cet46: clampScore(
      getFromPrimaryOrFallback(dualSource, raw, CET46_SCORE_ALIASES) ?? fallbackDualScores.cet46,
    ),
    daily: clampScore(
      getFromPrimaryOrFallback(dualSource, raw, DAILY_SCORE_ALIASES) ?? fallbackDualScores.daily,
    ),
  }

  const fallbackErrorMetrics = calculateErrorMetrics(diffs)
  const serRaw = getFromPrimaryOrFallback(metricsSource, raw, SER_ALIASES)
  const ferRaw = getFromPrimaryOrFallback(metricsSource, raw, FER_ALIASES)
  const rerRaw = getFromPrimaryOrFallback(metricsSource, raw, RER_ALIASES)
  const serNum = serRaw === undefined ? null : toNumber(serRaw)
  const ferNum = ferRaw === undefined ? null : toNumber(ferRaw)

  const ser = serNum === null && ferNum === null
    ? fallbackErrorMetrics.ser
    : serNum === null
      ? clampScore(100 - (ferNum ?? 0))
      : clampScore(serNum)
  const fer = ferNum === null && serNum === null
    ? fallbackErrorMetrics.fer
    : ferNum === null
      ? clampScore(100 - (serNum ?? 0))
      : clampScore(ferNum)
  const rer = rerRaw === undefined ? 0 : clampScore(rerRaw)

  const reviewPlanRaw = getAliasedValue(raw, REVIEW_PLAN_ALIASES)
  const parsedPlan = parseReviewPlanDays(reviewPlanRaw)
  const reviewPlanDays = parsedPlan.length > 0 ? parsedPlan : calculateReviewPlanDays(diffs)

  return {
    overallScore,
    dimensionScores,
    dualScores,
    verdictZh,
    diffs,
    errorMetrics: { ser, fer, rer },
    reviewPlanDays,
    betterVersion: {
      minimalEdit,
      naturalAlt,
    },
    strengths,
    nextFocus,
  }
}

async function evaluateChunk(
  sourceChunk: string,
  promptChunk: string,
  userChunk: string,
  profile: ApiProfile,
): Promise<ChunkEvalResult> {
  const messages = buildBackTranslationEvalPrompt(sourceChunk, promptChunk, userChunk)
  const execute = (requestMessages: ChatMessage[]) =>
    callLLM({
      baseURL: profile.baseURL,
      apiKey: profile.apiKey,
      model: profile.model,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
      messages: requestMessages,
      responseFormat: { type: "json_object" },
    })

  const firstResponse = await execute(messages)
  const firstAttempt = parseEvalAttempt(firstResponse.content)
  if (firstAttempt.normalized && !isEmptyEval(firstAttempt.normalized)) {
    return firstAttempt.normalized
  }

  if (firstAttempt.parsed) {
    const provider = isLikelyProviderErrorPayload(firstAttempt.parsed)
    if (provider.isProviderError) {
      throw new Error(
        `模型服务返回了非评估结果：code=${provider.code || "unknown"}${provider.message ? `，message=${provider.message}` : ""}。请检查当前模型是否支持 chat.completions 文本生成。`,
      )
    }
  }

  const retryMessages = buildRepairMessages(messages, firstResponse.content)
  const secondResponse = await execute(retryMessages)
  const secondAttempt = parseEvalAttempt(secondResponse.content)
  if (secondAttempt.normalized && !isEmptyEval(secondAttempt.normalized)) {
    return secondAttempt.normalized
  }

  if (secondAttempt.parsed) {
    const provider = isLikelyProviderErrorPayload(secondAttempt.parsed)
    if (provider.isProviderError) {
      throw new Error(
        `模型服务返回了非评估结果：code=${provider.code || "unknown"}${provider.message ? `，message=${provider.message}` : ""}。请检查当前模型是否支持 chat.completions 文本生成。`,
      )
    }
  }

  const keys1 = firstAttempt.parsed ? Object.keys(firstAttempt.parsed).slice(0, 8).join(", ") : "non-json"
  const keys2 = secondAttempt.parsed ? Object.keys(secondAttempt.parsed).slice(0, 8).join(", ") : "non-json"
  throw new Error(
    `AI 连续两次返回了非评估结构（first: ${keys1 || "none"}; retry: ${keys2 || "none"}）。建议切换为通用对话模型并提高 Max Tokens。`,
  )
}

function aggregateResults(
  chunkResults: ChunkEvalResult[],
  chunkWordCounts: number[],
): PracticeEvalResult {
  if (chunkResults.length === 1) return chunkResults[0]

  const totalWords = chunkWordCounts.reduce((a, b) => a + b, 0)
  const weights = chunkWordCounts.map((w) => totalWords > 0 ? w / totalWords : 1 / chunkResults.length)

  const dimensionScores: PracticeDimensionScores = {
    semantic: 0,
    grammar: 0,
    lexical: 0,
    naturalness: 0,
  }
  const dualScores: PracticeDualScores = {
    cet46: 0,
    daily: 0,
  }
  const errorMetrics: PracticeErrorMetrics = {
    ser: 0,
    fer: 0,
    rer: 0,
  }

  for (let i = 0; i < chunkResults.length; i++) {
    const w = weights[i]
    dimensionScores.semantic += chunkResults[i].dimensionScores.semantic * w
    dimensionScores.grammar += chunkResults[i].dimensionScores.grammar * w
    dimensionScores.lexical += chunkResults[i].dimensionScores.lexical * w
    dimensionScores.naturalness += chunkResults[i].dimensionScores.naturalness * w
    dualScores.cet46 += chunkResults[i].dualScores.cet46 * w
    dualScores.daily += chunkResults[i].dualScores.daily * w
    errorMetrics.ser += chunkResults[i].errorMetrics.ser * w
    errorMetrics.fer += chunkResults[i].errorMetrics.fer * w
  }

  dimensionScores.semantic = Math.round(dimensionScores.semantic)
  dimensionScores.grammar = Math.round(dimensionScores.grammar)
  dimensionScores.lexical = Math.round(dimensionScores.lexical)
  dimensionScores.naturalness = Math.round(dimensionScores.naturalness)
  dualScores.cet46 = Math.round(dualScores.cet46)
  dualScores.daily = Math.round(dualScores.daily)
  errorMetrics.ser = Math.round(errorMetrics.ser)
  errorMetrics.fer = Math.round(errorMetrics.fer)
  errorMetrics.rer = 0

  const overallScore = Math.round(
    dimensionScores.semantic * 0.4 +
    dimensionScores.grammar * 0.25 +
    dimensionScores.lexical * 0.2 +
    dimensionScores.naturalness * 0.15,
  )

  const severityOrder = { critical: 0, major: 1, minor: 2 }
  const allDiffs = chunkResults.flatMap((r) => r.diffs)
  allDiffs.sort((a, b) => {
    const byScore = (b.severityScore ?? SEVERITY_SCORE_MAP[b.severity]) - (a.severityScore ?? SEVERITY_SCORE_MAP[a.severity])
    if (byScore !== 0) return byScore
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  const strengths = [...new Set(chunkResults.flatMap((r) => r.strengths))]
  const nextFocus = [...new Set(chunkResults.flatMap((r) => r.nextFocus))]

  const minimalEdit = chunkResults.map((r) => r.betterVersion.minimalEdit).filter(Boolean).join("\n\n")
  const naturalAlt = chunkResults.map((r) => r.betterVersion.naturalAlt).filter(Boolean).join("\n\n")
  const reviewPlanDays = [
    ...new Set(chunkResults.flatMap((r) => r.reviewPlanDays).filter((d) => Number.isFinite(d) && d > 0)),
  ].sort((a, b) => a - b)

  const verdicts = chunkResults.map((r) => r.verdictZh).filter(Boolean)
  const verdictZh = verdicts.length === 1 ? verdicts[0] : verdicts.join("；")

  if (dualScores.cet46 === 0 && dualScores.daily === 0) {
    const fallbackDual = calculateDualScores(dimensionScores, allDiffs)
    dualScores.cet46 = fallbackDual.cet46
    dualScores.daily = fallbackDual.daily
  }

  if (errorMetrics.ser === 0 && errorMetrics.fer === 0) {
    const fallbackMetrics = calculateErrorMetrics(allDiffs)
    errorMetrics.ser = fallbackMetrics.ser
    errorMetrics.fer = fallbackMetrics.fer
  }

  return {
    overallScore,
    dimensionScores,
    dualScores,
    verdictZh,
    diffs: allDiffs,
    errorMetrics,
    reviewPlanDays: reviewPlanDays.length > 0 ? reviewPlanDays : calculateReviewPlanDays(allDiffs),
    betterVersion: { minimalEdit, naturalAlt },
    strengths,
    nextFocus,
  }
}

export async function evaluateBackTranslation(
  sourceText: string,
  promptText: string,
  userTranslation: string,
  profile: ApiProfile,
  onProgress?: (current: number, total: number) => void,
): Promise<PracticeEvalResult> {
  const sourceChunks = splitTextIntoChunks(sourceText)
  const promptChunks = alignChunks(sourceChunks, promptText)
  const userChunks = alignChunks(sourceChunks, userTranslation)
  const chunkWordCounts = sourceChunks.map(countWords)

  const total = sourceChunks.length
  onProgress?.(0, total)

  if (total <= 1) {
    const result = await evaluateChunk(
      sourceChunks[0] || sourceText,
      promptChunks[0] || promptText,
      userChunks[0] || userTranslation,
      profile,
    )
    onProgress?.(1, 1)
    return result
  }

  const chunkResults: ChunkEvalResult[] = new Array(total)
  let completed = 0

  for (let start = 0; start < total; start += CONCURRENCY_LIMIT) {
    const batch = sourceChunks.slice(start, start + CONCURRENCY_LIMIT)
    const results = await Promise.all(
      batch.map((_, offset) => {
        const i = start + offset
        return evaluateChunk(sourceChunks[i], promptChunks[i], userChunks[i], profile)
      }),
    )

    results.forEach((result, offset) => {
      chunkResults[start + offset] = result
      completed++
      onProgress?.(completed, total)
    })
  }

  return aggregateResults(chunkResults, chunkWordCounts)
}
