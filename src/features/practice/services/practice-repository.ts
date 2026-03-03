import { db } from "@/lib/db/dexie"
import type { PracticeMaterial, PracticeAttempt } from "@/types/db"

function generateId(): string {
  return crypto.randomUUID()
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function createMaterial(input: {
  title: string
  sourceText: string
  promptText: string
}): Promise<PracticeMaterial> {
  const now = Date.now()
  const material: PracticeMaterial = {
    id: generateId(),
    title: input.title,
    sourceText: input.sourceText,
    promptText: input.promptText,
    wordCount: countWords(input.sourceText),
    bestScore: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.practiceMaterials.add(material)
  return material
}

export async function listMaterials(): Promise<PracticeMaterial[]> {
  return db.practiceMaterials.orderBy("updatedAt").reverse().toArray()
}

export async function getMaterial(id: string): Promise<PracticeMaterial | undefined> {
  return db.practiceMaterials.get(id)
}

export async function deleteMaterial(id: string): Promise<void> {
  await db.transaction("rw", [db.practiceMaterials, db.practiceAttempts], async () => {
    await db.practiceAttempts.where("materialId").equals(id).delete()
    await db.practiceMaterials.delete(id)
  })
}

export async function getAttempts(materialId: string): Promise<PracticeAttempt[]> {
  return db.practiceAttempts
    .where("materialId")
    .equals(materialId)
    .reverse()
    .sortBy("createdAt")
}

export async function savePracticeAttemptAndPrune(
  materialId: string,
  attemptInput: Omit<PracticeAttempt, "id" | "materialId" | "isBest" | "createdAt">,
): Promise<PracticeAttempt> {
  const now = Date.now()
  const newAttempt: PracticeAttempt = {
    ...attemptInput,
    id: generateId(),
    materialId,
    isBest: false,
    createdAt: now,
  }

  await db.transaction("rw", [db.practiceMaterials, db.practiceAttempts], async () => {
    await db.practiceAttempts.add(newAttempt)

    const allAttempts = await db.practiceAttempts
      .where("materialId")
      .equals(materialId)
      .toArray()

    if (allAttempts.length === 0) return

    const latest = allAttempts.reduce((a, b) => a.createdAt > b.createdAt ? a : b)
    const best = allAttempts.reduce((a, b) => a.overallScore > b.overallScore ? a : b)

    const keepIds = new Set<string>()
    keepIds.add(latest.id)
    keepIds.add(best.id)

    const toDelete = allAttempts.filter((a) => !keepIds.has(a.id))
    if (toDelete.length > 0) {
      await db.practiceAttempts.bulkDelete(toDelete.map((a) => a.id))
    }

    for (const attempt of allAttempts) {
      if (!keepIds.has(attempt.id)) continue
      const shouldBeBest = attempt.id === best.id
      if (attempt.isBest !== shouldBeBest) {
        await db.practiceAttempts.update(attempt.id, { isBest: shouldBeBest })
      }
    }

    if (newAttempt.id === best.id) {
      newAttempt.isBest = true
    }

    await db.practiceMaterials.update(materialId, {
      bestScore: best.overallScore,
      updatedAt: now,
    })
  })

  return newAttempt
}
