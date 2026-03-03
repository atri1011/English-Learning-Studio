import { isSupabaseConfigured, fromTable, rpcCall } from "@/lib/supabase/client"
import { db } from "@/lib/db/dexie"
import { getPending, markDone, incrementRetry, getPendingCount } from "./sync-queue"
import { runWithSyncHooksSuppressed } from "./sync-hooks"
import { detectConflict, resolveThreeWay, logConflict } from "./conflict-resolver"
import { useSyncStore } from "@/stores/sync-store"
import type { SyncableTable } from "@/types/db"

/** Map Dexie camelCase table names to Supabase snake_case */
const TABLE_MAP: Record<SyncableTable, string> = {
  articles: "articles",
  sentences: "sentences",
  analysisResults: "analysis_results",
  apiProfiles: "api_profiles",
  vocabulary: "vocabulary",
  practiceMaterials: "practice_materials",
  practiceAttempts: "practice_attempts",
}

/** Map Dexie camelCase field names to Supabase snake_case for common fields */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
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
    deletedAt: "deleted_at",
    lastModifiedBy: "last_modified_by",
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
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = map[key] ?? key
    result[snakeKey] = value
  }
  return result
}

/** Reverse: snake_case back to camelCase */
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    article_id: "articleId",
    sentence_id: "sentenceId",
    request_hash: "requestHash",
    analysis_type: "analysisType",
    result_json: "resultJson",
    error_message: "errorMessage",
    raw_text: "rawText",
    source_type: "sourceType",
    word_count: "wordCount",
    sentence_count: "sentenceCount",
    char_start: "charStart",
    char_end: "charEnd",
    normalized_word: "normalizedWord",
    meaning_zh: "meaningZh",
    base_url: "baseURL",
    is_active: "isActive",
    max_tokens: "maxTokens",
    created_at: "createdAt",
    updated_at: "updatedAt",
    deleted_at: "deletedAt",
    last_modified_by: "lastModifiedBy",
    material_id: "materialId",
    user_translation: "userTranslation",
    overall_score: "overallScore",
    dimension_scores: "dimensionScores",
    dual_scores: "dualScores",
    verdict_zh: "verdictZh",
    error_metrics: "errorMetrics",
    review_plan_days: "reviewPlanDays",
    better_version: "betterVersion",
    next_focus: "nextFocus",
    is_best: "isBest",
    source_text: "sourceText",
    prompt_text: "promptText",
    best_score: "bestScore",
  }
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = map[key] ?? key
    result[camelKey] = value
  }
  return result
}

/** Convert timestamps: Dexie stores epoch ms, Supabase stores ISO string */
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

function preserveApiProfileSecret(
  tableName: SyncableTable,
  localRow: unknown,
  remoteData: Record<string, unknown>,
): void {
  if (tableName !== "apiProfiles") return

  const localApiKey = typeof (localRow as Record<string, unknown> | undefined)?.apiKey === "string"
    ? ((localRow as Record<string, unknown>).apiKey as string)
    : ""
  const remoteApiKey = typeof remoteData.apiKey === "string" ? remoteData.apiKey : ""

  // Cloud payload never includes plaintext key; keep local secret when present.
  if (!remoteApiKey && localApiKey) {
    remoteData.apiKey = localApiKey
  } else if (remoteData.apiKey == null) {
    remoteData.apiKey = ""
  }

  // Defensive cleanup for server-side ciphertext field.
  delete remoteData.api_key_cipher
  delete remoteData.apiKeyCipher
}

/** Exponential backoff with full jitter */
function backoffMs(retries: number): number {
  const base = 1000
  const cap = 60_000
  const exp = Math.min(base * Math.pow(2, retries), cap)
  return Math.random() * exp
}

export class SyncEngine {
  private userId: string | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private onlineHandler: (() => void) | null = null
  private offlineHandler: (() => void) | null = null

  /** Start sync engine for authenticated user */
  start(userId: string): void {
    if (this.userId === userId && this.timer) return
    this.userId = userId
    this.running = true

    // Register sync function in store
    const store = useSyncStore.getState()
    store._registerSyncFn(() => this.runOnce())

    // Auto sync every 30s
    this.timer = setInterval(() => {
      if (this.running) this.runOnce()
    }, 30_000)

    // Sync on network recovery
    this.onlineHandler = () => {
      useSyncStore.getState().setStatus("idle")
      this.runOnce()
    }
    this.offlineHandler = () => {
      useSyncStore.getState().setStatus("offline")
    }
    window.addEventListener("online", this.onlineHandler)
    window.addEventListener("offline", this.offlineHandler)

    // Initial sync
    this.runOnce()
  }

  /** Stop sync engine */
  stop(): void {
    this.running = false
    this.userId = null
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.onlineHandler) {
      window.removeEventListener("online", this.onlineHandler)
      this.onlineHandler = null
    }
    if (this.offlineHandler) {
      window.removeEventListener("offline", this.offlineHandler)
      this.offlineHandler = null
    }
    useSyncStore.getState()._registerSyncFn(null)
  }

  /** Execute one sync cycle: push then pull */
  async runOnce(): Promise<void> {
    if (!this.userId || !isSupabaseConfigured()) return
    if (!navigator.onLine) {
      useSyncStore.getState().setStatus("offline")
      return
    }

    const store = useSyncStore.getState()
    if (store.status === "syncing") return

    store.setStatus("syncing")
    try {
      await this.flushPush()
      await this.pull()
      const pending = await getPendingCount()
      useSyncStore.getState().setPendingCount(pending)
      useSyncStore.getState().setLastSyncAt(Date.now())
      useSyncStore.getState().setStatus("synced")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed"
      useSyncStore.getState().setStatus("error", msg)
    }
  }

  /** Push pending local mutations to Supabase */
  private async flushPush(limit = 50): Promise<void> {
    const items = await getPending(limit)
    if (items.length === 0) return

    const doneIds: string[] = []

    for (const item of items) {
      if (item.retries >= 8) {
        // Dead letter - skip but keep in queue for manual handling
        continue
      }

      const remoteTable = TABLE_MAP[item.tableName]
      if (!remoteTable) continue

      try {
        const payload = toSnakeCase(item.payload)
        payload.user_id = this.userId

        // Never sync plaintext API keys
        if (item.tableName === "apiProfiles") {
          delete payload.apiKey
          delete payload.api_key
          delete payload.api_key_cipher
        }

        // Convert epoch timestamps to ISO
        for (const key of ["created_at", "updated_at", "deleted_at"]) {
          if (payload[key] && typeof payload[key] === "number") {
            payload[key] = epochToIso(payload[key])
          }
        }

        if (item.op === "DELETE") {
          // Soft delete: set deleted_at instead of physical delete
          const { error } = await fromTable(remoteTable)
            .update({ deleted_at: new Date().toISOString(), last_modified_by: "client" })
            .eq("id", item.rowId)
            .eq("user_id", this.userId!)
          if (error) throw error
        } else {
          // Upsert for INSERT and UPDATE
          // Remove fields that shouldn't be sent
          delete payload.version // Let server trigger handle version
          const { error } = await fromTable(remoteTable).upsert(payload, {
            onConflict: "user_id,id",
          })
          if (error) throw error
        }

        // Update shadow
        await db.syncShadow.put({
          id: `${item.tableName}:${item.rowId}`,
          tableName: item.tableName,
          rowId: item.rowId,
          snapshot: item.payload,
          version: (item.payload.version as number) ?? 1,
        })

        doneIds.push(item.id)
      } catch (err) {
        await incrementRetry(item.id, err instanceof Error ? err.message : "Unknown error")
        // Exponential backoff - wait before next attempt
        await new Promise((r) => setTimeout(r, backoffMs(item.retries)))
      }
    }

    if (doneIds.length > 0) {
      await markDone(doneIds)
    }
  }

  /** Pull remote changes from Supabase */
  private async pull(limit = 100): Promise<void> {
    // Get last sync sequence
    const meta = await db.syncMeta.get({ key: "lastSeq" })
    const sinceSeq = meta ? parseInt(meta.value, 10) : 0

    const { data: events, error } = await rpcCall("pull_changes", {
      p_since_seq: sinceSeq,
      p_limit: limit,
    })

    if (error) throw error
    if (!events || events.length === 0) return

    await runWithSyncHooksSuppressed(async () => {
      for (const event of events) {
        await this.applyRemoteEvent(event)
      }

      // Update last seq
      const lastSeq = events[events.length - 1].seq
      await db.syncMeta.put({
        id: "lastSeq",
        key: "lastSeq",
        value: String(lastSeq),
      })
    })
  }

  /** Apply a single remote event to local Dexie */
  private async applyRemoteEvent(event: {
    table_name: string
    row_id: string
    op: string
    version: number
    payload: Record<string, unknown>
  }): Promise<void> {
    // Find local table name from remote
    const localTableName = (Object.entries(TABLE_MAP).find(
      ([, v]) => v === event.table_name,
    )?.[0] ?? event.table_name) as SyncableTable

    const table = db.table(localTableName)
    const localRow = await table.get(event.row_id)
    const remoteData = toCamelCase(event.payload as Record<string, unknown>)

    // Convert ISO timestamps back to epoch
    for (const key of ["createdAt", "updatedAt", "deletedAt"]) {
      if (remoteData[key] && typeof remoteData[key] === "string") {
        remoteData[key] = isoToEpoch(remoteData[key])
      }
    }

    // Remove server-only fields
    delete remoteData.user_id
    delete remoteData.userId
    preserveApiProfileSecret(localTableName, localRow, remoteData)

    if (event.op === "DELETE" || remoteData.deletedAt) {
      if (localRow) {
        await table.delete(event.row_id)
      }
      return
    }

    if (!localRow) {
      // No local copy → just insert
      await table.put(remoteData)
    } else {
      // Check for conflicts
      const shadow = await db.syncShadow.get(`${localTableName}:${event.row_id}`)
      const shadowVersion = shadow?.version ?? 0

      const localVersion = (localRow as Record<string, unknown>).version as number ?? 0
      const conflict = detectConflict(localVersion, event.version, shadowVersion)

      if (conflict.hasConflict) {
        // Try three-way merge
        const base = shadow?.snapshot ?? {}
        const { merged, conflictFields } = resolveThreeWay(
          localRow as Record<string, unknown>,
          remoteData,
          base,
        )

        if (conflictFields.length > 0) {
          await logConflict(
            localTableName,
            event.row_id,
            localRow as Record<string, unknown>,
            remoteData,
            base,
            "merged",
            merged,
          )
          useSyncStore.getState().setConflicts(
            useSyncStore.getState().conflicts + 1,
          )
        }

        await table.put(merged)
      } else {
        // No conflict → apply remote
        await table.put(remoteData)
      }
    }

    // Update shadow
    await db.syncShadow.put({
      id: `${localTableName}:${event.row_id}`,
      tableName: localTableName,
      rowId: event.row_id,
      snapshot: remoteData,
      version: event.version,
    })
  }
}

/** Singleton sync engine instance */
export const syncEngine = new SyncEngine()
