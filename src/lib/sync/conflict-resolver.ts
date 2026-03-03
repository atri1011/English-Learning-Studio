import type { ConflictLogEntry, SyncableTable } from "@/types/db"
import { db } from "@/lib/db/dexie"

export interface ConflictDetection {
  hasConflict: boolean
  localVersion: number
  remoteVersion: number
}

/**
 * Detect whether a conflict exists between local and remote versions.
 * A conflict occurs when both local and remote have diverged from the shadow (base).
 */
export function detectConflict(
  localVersion: number,
  remoteVersion: number,
  shadowVersion: number,
): ConflictDetection {
  const localChanged = localVersion > shadowVersion
  const remoteChanged = remoteVersion > shadowVersion
  return {
    hasConflict: localChanged && remoteChanged,
    localVersion,
    remoteVersion,
  }
}

/**
 * Three-way merge: merge field-by-field using base as reference.
 * If both sides changed the same field to different values, remote wins (LWW fallback).
 */
export function resolveThreeWay(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  base: Record<string, unknown>,
): { merged: Record<string, unknown>; conflictFields: string[] } {
  const merged: Record<string, unknown> = { ...base }
  const conflictFields: string[] = []
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base)])

  // Skip metadata fields from merge decisions
  const skipFields = new Set(["version", "updated_at", "updatedAt", "last_modified_by", "lastModifiedBy"])

  for (const key of allKeys) {
    if (skipFields.has(key)) continue

    const baseVal = JSON.stringify(base[key])
    const localVal = JSON.stringify(local[key])
    const remoteVal = JSON.stringify(remote[key])

    const localChanged = localVal !== baseVal
    const remoteChanged = remoteVal !== baseVal

    if (localChanged && remoteChanged && localVal !== remoteVal) {
      // Both changed to different values → remote wins, log conflict
      merged[key] = remote[key]
      conflictFields.push(key)
    } else if (localChanged) {
      merged[key] = local[key]
    } else if (remoteChanged) {
      merged[key] = remote[key]
    }
    // Neither changed → keep base
  }

  return { merged, conflictFields }
}

/**
 * Last-writer-wins fallback: the version with higher version number wins.
 */
export function resolveLWW(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): Record<string, unknown> {
  const localV = (local.version as number) ?? 0
  const remoteV = (remote.version as number) ?? 0
  return remoteV >= localV ? remote : local
}

/**
 * Log a conflict to the conflict_log table for audit.
 */
export async function logConflict(
  tableName: SyncableTable,
  rowId: string,
  localVersion: Record<string, unknown>,
  remoteVersion: Record<string, unknown>,
  baseVersion: Record<string, unknown> | null,
  resolution: ConflictLogEntry["resolution"],
  resolvedData: Record<string, unknown> | null,
): Promise<void> {
  const entry: ConflictLogEntry = {
    id: crypto.randomUUID(),
    tableName,
    rowId,
    localVersion,
    remoteVersion,
    baseVersion,
    resolution,
    resolvedData,
    createdAt: Date.now(),
  }
  await db.conflictLog.add(entry)
}
