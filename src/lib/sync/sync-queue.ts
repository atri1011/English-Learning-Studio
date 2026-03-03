import { db } from "@/lib/db/dexie"
import type { SyncQueueItem, SyncOp, SyncableTable } from "@/types/db"

export async function addToQueue(
  tableName: SyncableTable,
  rowId: string,
  op: SyncOp,
  payload: Record<string, unknown>,
): Promise<void> {
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    tableName,
    rowId,
    op,
    payload,
    createdAt: Date.now(),
    retries: 0,
    lastError: null,
  }
  await db.syncQueue.add(item)
}

export async function getPending(limit = 50): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy("createdAt").limit(limit).toArray()
}

export async function markDone(ids: string[]): Promise<void> {
  await db.syncQueue.bulkDelete(ids)
}

export async function incrementRetry(id: string, error: string): Promise<void> {
  const existing = await db.syncQueue.get(id)
  if (!existing) return
  await db.syncQueue.update(id, {
    retries: existing.retries + 1,
    lastError: error,
  })
}

export async function getPendingCount(): Promise<number> {
  return db.syncQueue.count()
}

export async function clearAll(): Promise<void> {
  await db.syncQueue.clear()
}
