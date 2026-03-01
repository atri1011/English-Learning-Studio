import { db } from "./dexie"

interface BackupDataV1 {
  version: 1
  exportedAt: number
  data: {
    articles: unknown[]
    sentences: unknown[]
    analysisResults: unknown[]
    apiProfiles: unknown[]
  }
}

interface BackupDataV2 {
  version: 2
  exportedAt: number
  data: {
    articles: unknown[]
    sentences: unknown[]
    analysisResults: unknown[]
    apiProfiles: unknown[]
    vocabulary: unknown[]
  }
}

type BackupData = BackupDataV1 | BackupDataV2

export async function exportBackup(): Promise<string> {
  const [articles, sentences, analysisResults, apiProfiles, vocabulary] = await Promise.all([
    db.articles.toArray(),
    db.sentences.toArray(),
    db.analysisResults.toArray(),
    db.apiProfiles.toArray(),
    db.vocabulary.toArray(),
  ])

  const backup: BackupDataV2 = {
    version: 2,
    exportedAt: Date.now(),
    data: { articles, sentences, analysisResults, apiProfiles, vocabulary },
  }

  return JSON.stringify(backup)
}

export function downloadBackup(json: string) {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `english-studio-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<{ articles: number; sentences: number }> {
  const text = await file.text()
  let backup: BackupData

  try {
    backup = JSON.parse(text)
  } catch {
    throw new Error("Invalid backup file: not valid JSON")
  }

  if (!backup.data || (backup.version !== 1 && backup.version !== 2)) {
    throw new Error("Invalid backup file: unrecognized format")
  }

  const { articles, sentences, analysisResults, apiProfiles } = backup.data
  const vocabulary = backup.version === 2 ? backup.data.vocabulary : []

  const migratedArticles = (articles ?? []).map((a: unknown) => {
    const article = a as Record<string, unknown>
    return {
      ...article,
      tags: article.tags ?? [],
    }
  })

  await db.transaction("rw", [db.articles, db.sentences, db.analysisResults, db.apiProfiles, db.vocabulary], async () => {
    await db.articles.clear()
    await db.sentences.clear()
    await db.analysisResults.clear()
    await db.apiProfiles.clear()
    await db.vocabulary.clear()

    if (migratedArticles.length) await db.articles.bulkAdd(migratedArticles as never[])
    if (sentences?.length) await db.sentences.bulkAdd(sentences as never[])
    if (analysisResults?.length) await db.analysisResults.bulkAdd(analysisResults as never[])
    if (apiProfiles?.length) await db.apiProfiles.bulkAdd(apiProfiles as never[])
    if (vocabulary?.length) await db.vocabulary.bulkAdd(vocabulary as never[])
  })

  return {
    articles: migratedArticles.length,
    sentences: sentences?.length ?? 0,
  }
}
