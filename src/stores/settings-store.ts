import { create } from "zustand"
import { persist } from "zustand/middleware"
import { db } from "@/lib/db/dexie"
import {
  ENV_PROFILE_ID,
  getEnvProfile,
  isEnvProfile,
  setEnvProfileOverrides,
  type EnvProfileOverrides,
} from "@/lib/config/env-profile"
import type { ApiProfile } from "@/types/db"

function generateId(): string {
  return crypto.randomUUID()
}

function mergeProfiles(
  dbProfiles: ApiProfile[],
  envProfile: ApiProfile | null,
  activeProfileId: string | null,
): ApiProfile[] {
  const profiles: ApiProfile[] = envProfile
    ? [{ ...envProfile, isActive: activeProfileId === ENV_PROFILE_ID ? 1 : 0 }]
    : []
  profiles.push(
    ...dbProfiles.map((p) => ({ ...p, isActive: p.id === activeProfileId ? 1 : 0 })),
  )
  return profiles
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
  updateEnvOverrides: (overrides: Partial<EnvProfileOverrides>) => void
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
        const dbProfiles = await db.apiProfiles.toArray()
        const envProfile = getEnvProfile()
        const dbActive = dbProfiles.find((p) => p.isActive === 1)
        const currentActiveId = get().activeProfileId

        let nextActiveId: string | null = null
        if (currentActiveId === ENV_PROFILE_ID && envProfile) {
          nextActiveId = ENV_PROFILE_ID
        } else if (currentActiveId && dbProfiles.some((p) => p.id === currentActiveId)) {
          nextActiveId = currentActiveId
        } else if (dbActive) {
          nextActiveId = dbActive.id
        } else if (envProfile) {
          nextActiveId = ENV_PROFILE_ID
        } else {
          nextActiveId = dbProfiles[0]?.id ?? null
        }

        set({
          profiles: mergeProfiles(dbProfiles, envProfile, nextActiveId),
          activeProfileId: nextActiveId,
          loading: false,
        })
      },

      addProfile: async (data) => {
        const now = Date.now()
        const hasDbProfiles = get().profiles.some((p) => !isEnvProfile(p.id))
        const isFirst = !hasDbProfiles && !getEnvProfile()
        const profile: ApiProfile = {
          ...data,
          id: generateId(),
          isActive: isFirst ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        }
        await db.apiProfiles.add(profile)
        set((s) => ({
          profiles: mergeProfiles(
            [...s.profiles.filter((p) => !isEnvProfile(p.id)), profile],
            getEnvProfile(),
            isFirst ? profile.id : s.activeProfileId,
          ),
          activeProfileId: isFirst ? profile.id : s.activeProfileId,
        }))
        return profile
      },

      updateProfile: async (id, data) => {
        if (isEnvProfile(id)) {
          get().updateEnvOverrides({
            temperature: data.temperature,
            maxTokens: data.maxTokens,
          })
          return
        }

        const now = Date.now()
        await db.apiProfiles.update(id, { ...data, updatedAt: now })
        set((s) => ({
          profiles: mergeProfiles(
            s.profiles
              .filter((p) => !isEnvProfile(p.id))
              .map((p) => (p.id === id ? { ...p, ...data, updatedAt: now } : p)),
            getEnvProfile(),
            s.activeProfileId,
          ),
        }))
      },

      deleteProfile: async (id) => {
        if (isEnvProfile(id)) return
        const { activeProfileId, profiles } = get()
        const envProfile = getEnvProfile()
        const dbProfiles = profiles.filter((p) => !isEnvProfile(p.id))
        const remaining = dbProfiles.filter((p) => p.id !== id)
        const needNewActive = activeProfileId === id
        const newActiveId = needNewActive
          ? remaining[0]?.id ?? (envProfile ? ENV_PROFILE_ID : null)
          : activeProfileId

        await db.transaction("rw", db.apiProfiles, async () => {
          await db.apiProfiles.delete(id)
          if (needNewActive && newActiveId && !isEnvProfile(newActiveId)) {
            await db.apiProfiles.update(newActiveId, { isActive: 1, updatedAt: Date.now() })
          }
        })

        set({
          profiles: mergeProfiles(remaining, envProfile, newActiveId),
          activeProfileId: newActiveId,
        })
      },

      setActiveProfile: async (id) => {
        if (isEnvProfile(id)) {
          const envProfile = getEnvProfile()
          if (!envProfile) return
          set((s) => ({
            profiles: mergeProfiles(
              s.profiles.filter((p) => !isEnvProfile(p.id)),
              envProfile,
              ENV_PROFILE_ID,
            ),
            activeProfileId: ENV_PROFILE_ID,
          }))
          return
        }

        const dbProfiles = get().profiles.filter((p) => !isEnvProfile(p.id))
        if (!dbProfiles.some((p) => p.id === id)) return
        await db.transaction("rw", db.apiProfiles, async () => {
          for (const p of dbProfiles) {
            await db.apiProfiles.update(p.id, {
              isActive: p.id === id ? 1 : 0,
              updatedAt: Date.now(),
            })
          }
        })
        set((s) => ({
          profiles: mergeProfiles(
            s.profiles
              .filter((p) => !isEnvProfile(p.id))
              .map((p) => ({ ...p, isActive: p.id === id ? 1 : 0 })),
            getEnvProfile(),
            id,
          ),
          activeProfileId: id,
        }))
      },

      updateEnvOverrides: (overrides) => {
        setEnvProfileOverrides(overrides)
        set((s) => ({
          profiles: mergeProfiles(
            s.profiles.filter((p) => !isEnvProfile(p.id)),
            getEnvProfile(),
            s.activeProfileId,
          ),
        }))
      },

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get()
        const envProfile = getEnvProfile()
        const dbProfiles = profiles.filter((p) => !isEnvProfile(p.id))

        if (activeProfileId === ENV_PROFILE_ID && envProfile) return { ...envProfile, isActive: 1 }
        const activeDbProfile = activeProfileId ? dbProfiles.find((p) => p.id === activeProfileId) : undefined
        if (activeDbProfile) return activeDbProfile
        if (envProfile) return { ...envProfile, isActive: 1 }
        return dbProfiles[0]
      },
    }),
    {
      name: "settings-store",
      partialize: (state) => ({ activeProfileId: state.activeProfileId }),
    },
  ),
)
