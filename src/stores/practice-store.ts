import { create } from "zustand"
import type { PracticeMaterial, PracticeAttempt } from "@/types/db"
import {
  listMaterials,
  createMaterial,
  deleteMaterial,
  getAttempts,
  savePracticeAttemptAndPrune,
} from "@/features/practice/services/practice-repository"
import { evaluateBackTranslation } from "@/features/practice/services/practice-evaluator"
import { useSettingsStore } from "./settings-store"

function diffFingerprint(diff: PracticeAttempt["diffs"][number]): string {
  const normalizedOriginal = diff.original.trim().toLowerCase().slice(0, 48)
  return `${diff.type}|${diff.category ?? ""}|${diff.rootCause ?? ""}|${normalizedOriginal}`
}

function computeRecurringErrorRate(
  currentDiffs: PracticeAttempt["diffs"],
  previousDiffs: PracticeAttempt["diffs"],
): number {
  if (currentDiffs.length === 0 || previousDiffs.length === 0) return 0
  const previousSet = new Set(previousDiffs.map(diffFingerprint))
  const recurringCount = currentDiffs.reduce((count, diff) => {
    return count + (previousSet.has(diffFingerprint(diff)) ? 1 : 0)
  }, 0)
  return Math.round((recurringCount / currentDiffs.length) * 100)
}

interface PracticeState {
  materials: PracticeMaterial[]
  selectedMaterialId: string | null
  attempts: Record<string, PracticeAttempt[]>
  evaluating: boolean
  evaluationProgress: { current: number; total: number } | null
  error: string | null

  loadMaterials: () => Promise<void>
  addMaterial: (input: { title: string; sourceText: string; promptText: string }) => Promise<void>
  removeMaterial: (id: string) => Promise<void>
  selectMaterial: (id: string | null) => void
  loadAttempts: (materialId: string) => Promise<void>
  submitBackTranslation: (userTranslation: string) => Promise<PracticeAttempt | null>
  clearError: () => void
}

export const usePracticeStore = create<PracticeState>()((set, get) => ({
  materials: [],
  selectedMaterialId: null,
  attempts: {},
  evaluating: false,
  evaluationProgress: null,
  error: null,

  loadMaterials: async () => {
    const materials = await listMaterials()
    set({ materials })
  },

  addMaterial: async (input) => {
    await createMaterial(input)
    const materials = await listMaterials()
    set({ materials })
  },

  removeMaterial: async (id) => {
    await deleteMaterial(id)
    const { selectedMaterialId, attempts } = get()
    const newAttempts = { ...attempts }
    delete newAttempts[id]
    set({
      materials: get().materials.filter((m) => m.id !== id),
      selectedMaterialId: selectedMaterialId === id ? null : selectedMaterialId,
      attempts: newAttempts,
    })
  },

  selectMaterial: (id) => {
    set({ selectedMaterialId: id, error: null })
  },

  loadAttempts: async (materialId) => {
    const attemptsList = await getAttempts(materialId)
    set((s) => ({
      attempts: { ...s.attempts, [materialId]: attemptsList },
    }))
  },

  submitBackTranslation: async (userTranslation) => {
    const { selectedMaterialId, materials, attempts } = get()
    if (!selectedMaterialId) {
      set({ error: "未选择练习素材" })
      return null
    }

    const material = materials.find((m) => m.id === selectedMaterialId)
    if (!material) {
      set({ error: "素材不存在" })
      return null
    }

    const profile = useSettingsStore.getState().getActiveProfile()
    if (!profile) {
      set({ error: "请先在设置中配置 API" })
      return null
    }

    set({ evaluating: true, evaluationProgress: null, error: null })

    try {
      const evalResult = await evaluateBackTranslation(
        material.sourceText,
        material.promptText,
        userTranslation,
        {
          baseURL: profile.baseURL,
          apiKey: profile.apiKey,
          model: profile.model,
          temperature: profile.temperature,
          maxTokens: profile.maxTokens,
        },
        (current, total) => {
          set({ evaluationProgress: { current, total } })
        },
      )

      const previousAttempt = (attempts[selectedMaterialId] ?? [])[0]
      const rer = computeRecurringErrorRate(evalResult.diffs, previousAttempt?.diffs ?? [])

      const attempt = await savePracticeAttemptAndPrune(selectedMaterialId, {
        userTranslation,
        overallScore: evalResult.overallScore,
        dimensionScores: evalResult.dimensionScores,
        dualScores: evalResult.dualScores,
        verdictZh: evalResult.verdictZh,
        diffs: evalResult.diffs,
        errorMetrics: {
          ...evalResult.errorMetrics,
          rer,
        },
        reviewPlanDays: evalResult.reviewPlanDays,
        betterVersion: evalResult.betterVersion,
        strengths: evalResult.strengths,
        nextFocus: evalResult.nextFocus,
        model: profile.model,
      })

      const updatedMaterials = await listMaterials()
      const updatedAttempts = await getAttempts(selectedMaterialId)

      set((s) => ({
        materials: updatedMaterials,
        attempts: { ...s.attempts, [selectedMaterialId]: updatedAttempts },
        evaluating: false,
        evaluationProgress: null,
      }))

      return attempt
    } catch (err) {
      set({
        evaluating: false,
        evaluationProgress: null,
        error: err instanceof Error ? err.message : "评估失败",
      })
      return null
    }
  },

  clearError: () => set({ error: null }),
}))
