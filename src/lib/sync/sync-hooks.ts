import { db } from "@/lib/db/dexie"
import { addToQueue } from "./sync-queue"
import type { SyncableTable } from "@/types/db"

/** Flag to suppress hook enqueuing during pull operations */
let _suppressHooks = false

export function setSuppressHooks(suppress: boolean): void {
  _suppressHooks = suppress
}

/** Execute a callback with sync hooks suppressed (prevents feedback loops during pull/migration) */
export async function runWithSyncHooksSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  _suppressHooks = true
  try {
    return await fn()
  } finally {
    _suppressHooks = false
  }
}

const SYNCABLE_TABLES: SyncableTable[] = [
  "articles",
  "sentences",
  "analysisResults",
  "apiProfiles",
  "vocabulary",
  "practiceMaterials",
  "practiceAttempts",
]

/**
 * Install Dexie hooks on all syncable tables to automatically
 * enqueue mutations into the sync_queue.
 */
export function installSyncHooks(): void {
  for (const tableName of SYNCABLE_TABLES) {
    const table = db.table(tableName)

    table.hook("creating", function (_primKey, obj) {
      if (_suppressHooks) return
      const payload = { ...obj }
      // Use queueMicrotask to avoid transactional conflicts
      queueMicrotask(() => {
        addToQueue(tableName, obj.id as string, "INSERT", payload)
      })
    })

    table.hook("updating", function (modifications, _primKey, obj) {
      if (_suppressHooks) return
      const merged = { ...obj, ...modifications }
      const rowId = (obj as Record<string, unknown>).id as string
      queueMicrotask(() => {
        addToQueue(tableName, rowId, "UPDATE", merged)
      })
    })

    table.hook("deleting", function (_primKey, obj) {
      if (_suppressHooks) return
      const rowId = (obj as Record<string, unknown>).id as string
      queueMicrotask(() => {
        addToQueue(tableName, rowId, "DELETE", { id: rowId })
      })
    })
  }
}
