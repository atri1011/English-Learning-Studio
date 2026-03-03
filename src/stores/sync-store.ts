import { create } from "zustand"

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline"

interface SyncState {
  status: SyncStatus
  pendingCount: number
  lastSyncAt: number | null
  errorMessage: string | null
  conflicts: number

  setStatus: (status: SyncStatus, errorMessage?: string) => void
  setPendingCount: (count: number) => void
  setLastSyncAt: (ts: number) => void
  setConflicts: (count: number) => void
  triggerSync: () => void

  // Set by sync-engine after initialization
  _syncFn: (() => Promise<void>) | null
  _registerSyncFn: (fn: (() => Promise<void>) | null) => void
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  status: "idle",
  pendingCount: 0,
  lastSyncAt: null,
  errorMessage: null,
  conflicts: 0,
  _syncFn: null,

  setStatus: (status, errorMessage) =>
    set({ status, errorMessage: errorMessage ?? null }),

  setPendingCount: (count) => set({ pendingCount: count }),

  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),

  setConflicts: (count) => set({ conflicts: count }),

  triggerSync: async () => {
    const fn = get()._syncFn
    if (fn) await fn()
  },

  _registerSyncFn: (fn) => set({ _syncFn: fn }),
}))
