import { db } from "@/lib/db/dexie"
import type { VocabularyEntry } from "@/types/db"

function generateId(): string {
  return crypto.randomUUID()
}

export async function addVocabularyEntry(
  data: Omit<VocabularyEntry, "id" | "normalizedWord" | "createdAt">,
): Promise<VocabularyEntry> {
  const entry: VocabularyEntry = {
    ...data,
    id: generateId(),
    normalizedWord: data.word.toLowerCase(),
    createdAt: Date.now(),
  }
  await db.vocabulary.add(entry)
  return entry
}

export async function removeVocabularyEntry(id: string): Promise<void> {
  await db.vocabulary.delete(id)
}

export async function getAllVocabulary(): Promise<VocabularyEntry[]> {
  return db.vocabulary.orderBy("createdAt").reverse().toArray()
}

export async function isWordSaved(normalizedWord: string): Promise<boolean> {
  const count = await db.vocabulary.where("normalizedWord").equals(normalizedWord).count()
  return count > 0
}

export async function removeByWord(normalizedWord: string): Promise<void> {
  await db.vocabulary.where("normalizedWord").equals(normalizedWord).delete()
}
