import { db } from "@/lib/db/dexie"
import { isSupabaseConfigured, fromTable } from "@/lib/supabase/client"
import { runWithSyncHooksSuppressed } from "./sync-hooks"
import type { SyncableTable } from "@/types/db"

/** Table name mapping for migration */
const TABLE_MAP: Record<SyncableTable, string> = {
  articles: "articles",
  sentences: "sentences",
  analysisResults: "analysis_results",
  apiProfiles: "api_profiles",
  vocabulary: "vocabulary",
  practiceMaterials: "practice_materials",
  practiceAttempts: "practice_attempts",
}

/** camelCase to snake_case field mapping */
const FIELD_MAP: Record<string, string> = {
  articleId: "article_id",
  sentenceId: "sentence_id",
  requestHash: "request_hash",
  analysisType: "analysis_type",
  resultJson: "result_json",
  errorMessage: "error_message",
  rawText: "raw_text",
  sourceType: "source_type",
  wordCount: "word_count",
  sentenceCount: "sentence_count",
  charStart: "char_start",
  charEnd: "char_end",
  normalizedWord: "normalized_word",
  meaningZh: "meaning_zh",
  baseURL: "base_url",
  isActive: "is_active",
  maxTokens: "max_tokens",
  createdAt: "created_at",
  updatedAt: "updated_at",
  materialId: "material_id",
  userTranslation: "user_translation",
  overallScore: "overall_score",
  dimensionScores: "dimension_scores",
  dualScores: "dual_scores",
  verdictZh: "verdict_zh",
  errorMetrics: "error_metrics",
  reviewPlanDays: "review_plan_days",
  betterVersion: "better_version",
  nextFocus: "next_focus",
  isBest: "is_best",
  sourceText: "source_text",
  promptText: "prompt_text",
  bestScore: "best_score",
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[FIELD_MAP[key] ?? key] = value
  }
  return result
}

function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const reverseMap: Record<string, string> = {}
  for (const [k, v] of Object.entries(FIELD_MAP)) reverseMap[v] = k
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[reverseMap[key] ?? key] = value
  }
  return result
}

function epochToIso(ts: unknown): string | null {
  if (typeof ts === "number") return new Date(ts).toISOString()
  if (typeof ts === "string") return ts
  return null
}

function isoToEpoch(ts: unknown): number {
  if (typeof ts === "number") return ts
  if (typeof ts === "string") return new Date(ts).getTime()
  return Date.now()
}

export interface MigrationProgress {
  table: string
  current: number
  total: number
}

/** Check if there is local data (used before first cloud sync) */
export async function detectLocalData(): Promise<boolean> {
  const counts = await Promise.all([
    db.articles.count(),
    db.sentences.count(),
    db.analysisResults.count(),
    db.vocabulary.count(),
    db.practiceMaterials.count(),
    db.practiceAttempts.count(),
    db.apiProfiles.count(),
  ])
  return counts.some((count) => count > 0)
}

/** Upload all local data to Supabase (for first-time login) */
export async function uploadLocal(
  userId: string,
  onProgress?: (progress: MigrationProgress) => void,
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured")

  const migrationOrder: SyncableTable[] = [
    "articles",
    "sentences",
    "analysisResults",
    "vocabulary",
    "practiceMaterials",
    "practiceAttempts",
    "apiProfiles",
  ]

  for (const tableName of migrationOrder) {
    const table = db.table(tableName)
    const rows = await table.toArray()
    const remoteTableName = TABLE_MAP[tableName]

    onProgress?.({ table: tableName, current: 0, total: rows.length })

    if (rows.length === 0) continue

    // Batch upsert in chunks of 100
    const chunkSize = 100
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const remoteRows = chunk.map((row) => {
        const snaked = toSnakeCase(row as Record<string, unknown>)
        snaked.user_id = userId
        snaked.last_modified_by = "migration"

        // Convert timestamps
        for (const key of ["created_at", "updated_at"]) {
          if (snaked[key] && typeof snaked[key] === "number") {
            snaked[key] = epochToIso(snaked[key])
          }
        }

        // Don't upload plaintext API keys
        if (tableName === "apiProfiles") {
          delete snaked.apiKey
          delete snaked.api_key
          delete snaked.api_key_cipher
        }

        return snaked
      })

      const { error } = await fromTable(remoteTableName).upsert(remoteRows, {
        onConflict: "user_id,id",
      })
      if (error) throw new Error(`Migration failed for ${tableName}: ${error.message}`)

      onProgress?.({ table: tableName, current: Math.min(i + chunkSize, rows.length), total: rows.length })
    }
  }
}

/** Download all cloud data to local Dexie (for restoring from cloud) */
export async function downloadCloud(
  userId: string,
  onProgress?: (progress: MigrationProgress) => void,
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured")

  await runWithSyncHooksSuppressed(async () => {
    const migrationOrder: SyncableTable[] = [
      "articles",
      "sentences",
      "analysisResults",
      "vocabulary",
      "practiceMaterials",
      "practiceAttempts",
      "apiProfiles",
    ]

    for (const tableName of migrationOrder) {
      const remoteTableName = TABLE_MAP[tableName]
      const table = db.table(tableName)

      // First count
      const { count, error: countErr } = await fromTable(remoteTableName)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("deleted_at", null)

      if (countErr) throw new Error(`Count failed for ${tableName}: ${countErr.message}`)

      const total = count ?? 0
      onProgress?.({ table: tableName, current: 0, total })

      if (total === 0) continue

      // Clear local table before downloading
      await table.clear()

      // Paginated fetch
      const pageSize = 200
      let offset = 0

      while (offset < total) {
        const { data, error } = await fromTable(remoteTableName)
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .range(offset, offset + pageSize - 1)

        if (error) throw new Error(`Fetch failed for ${tableName}: ${error.message}`)
        if (!data || data.length === 0) break

        const localRows = data.map((row: Record<string, unknown>) => {
          const camel = toCamelCase(row as Record<string, unknown>)
          // Remove server-only fields
          delete camel.user_id
          delete camel.userId
          delete camel.deleted_at
          delete camel.deletedAt
          delete camel.last_modified_by
          delete camel.lastModifiedBy
          delete camel.version

          // Convert ISO timestamps to epoch
          for (const key of ["createdAt", "updatedAt"]) {
            if (camel[key] && typeof camel[key] === "string") {
              camel[key] = isoToEpoch(camel[key])
            }
          }

          return camel
        })

        await table.bulkPut(localRows)
        offset += data.length
        onProgress?.({ table: tableName, current: Math.min(offset, total), total })
      }
    }
  })
}
