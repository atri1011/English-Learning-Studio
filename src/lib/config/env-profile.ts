import type { ApiProfile } from "@/types/db"

export const ENV_PROFILE_ID = "__env_profile__"
const OVERRIDES_KEY = "env-profile-overrides"
const DEFAULT_TEMPERATURE = 0.3
const DEFAULT_MAX_TOKENS = 200000

export interface EnvProfileOverrides {
  temperature?: number
  maxTokens?: number
}

function clampTemperature(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(2, value))
}

function clampMaxTokens(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  const n = Math.trunc(value)
  return Math.max(100, Math.min(2_000_000, n))
}

export function isEnvProfile(id: string): boolean {
  return id === ENV_PROFILE_ID
}

export function getEnvProfileOverrides(): EnvProfileOverrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}
    const result: EnvProfileOverrides = {}
    const t = clampTemperature((parsed as Record<string, unknown>).temperature)
    const m = clampMaxTokens((parsed as Record<string, unknown>).maxTokens)
    if (t !== undefined) result.temperature = t
    if (m !== undefined) result.maxTokens = m
    return result
  } catch {
    return {}
  }
}

export function setEnvProfileOverrides(overrides: EnvProfileOverrides): void {
  const current = getEnvProfileOverrides()
  const next: EnvProfileOverrides = { ...current }
  const t = clampTemperature(overrides.temperature)
  const m = clampMaxTokens(overrides.maxTokens)
  if (t !== undefined) next.temperature = t
  if (m !== undefined) next.maxTokens = m
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
  } catch {
    // ignore storage write errors
  }
}

export function getEnvProfile(): ApiProfile | null {
  const baseURL = (import.meta.env.VITE_API_BASE_URL ?? "").trim()
  const apiKey = (import.meta.env.VITE_API_KEY ?? "").trim()
  const model = (import.meta.env.VITE_API_MODEL ?? "").trim()
  if (!baseURL || !apiKey || !model) return null

  const name = (import.meta.env.VITE_API_NAME ?? "").trim() || "默认配置"
  const overrides = getEnvProfileOverrides()

  return {
    id: ENV_PROFILE_ID,
    name,
    baseURL,
    apiKey,
    model,
    temperature: overrides.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: overrides.maxTokens ?? DEFAULT_MAX_TOKENS,
    isActive: 0,
    createdAt: 0,
    updatedAt: 0,
  }
}
