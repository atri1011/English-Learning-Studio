import { create } from "zustand"
import { persist } from "zustand/middleware"
import { db } from "@/lib/db/dexie"
import type { ApiProfile } from "@/types/db"

function generateId(): string {
  return crypto.randomUUID()
}

interface SettingsState {
  profiles: ApiProfile[]
  activeProfileId: string | null
  loading: boolean
  loadProfiles: () => Promise<void>
  addProfile: (data: Omit<ApiProfile, "id" | "isActive" | "createdAt" | "updatedAt">) => Promise<ApiProfile>
  updateProfile: (id: string, data: Partial<ApiProfile>) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  setActiveProfile: (id: string) => Promise<void>
  getActiveProfile: () => ApiProfile | undefined
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      loading: false,

      loadProfiles: async () => {
        set({ loading: true })
        const profiles = await db.apiProfiles.toArray()
        const active = profiles.find((p) => p.isActive === 1)
        set({ profiles, activeProfileId: active?.id ?? null, loading: false })
      },

      addProfile: async (data) => {
        const now = Date.now()
        const isFirst = get().profiles.length === 0
        const profile: ApiProfile = {
          ...data,
          id: generateId(),
          isActive: isFirst ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        }
        await db.apiProfiles.add(profile)
        set((s) => ({
          profiles: [...s.profiles, profile],
          activeProfileId: isFirst ? profile.id : s.activeProfileId,
        }))
        return profile
      },

      updateProfile: async (id, data) => {
        await db.apiProfiles.update(id, { ...data, updatedAt: Date.now() })
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p,
          ),
        }))
      },

      deleteProfile: async (id) => {
        await db.apiProfiles.delete(id)
        set((s) => {
          const remaining = s.profiles.filter((p) => p.id !== id)
          const needNewActive = s.activeProfileId === id
          return {
            profiles: remaining,
            activeProfileId: needNewActive
              ? remaining[0]?.id ?? null
              : s.activeProfileId,
          }
        })
      },

      setActiveProfile: async (id) => {
        const { profiles } = get()
        await db.transaction("rw", db.apiProfiles, async () => {
          for (const p of profiles) {
            await db.apiProfiles.update(p.id, {
              isActive: p.id === id ? 1 : 0,
              updatedAt: Date.now(),
            })
          }
        })
        set((s) => ({
          profiles: s.profiles.map((p) => ({
            ...p,
            isActive: p.id === id ? 1 : 0,
          })),
          activeProfileId: id,
        }))
      },

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get()
        return profiles.find((p) => p.id === activeProfileId)
      },
    }),
    {
      name: "settings-store",
      partialize: (state) => ({ activeProfileId: state.activeProfileId }),
    },
  ),
)
