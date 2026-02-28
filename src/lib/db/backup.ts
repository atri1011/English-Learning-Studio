import { db } from "./dexie"

interface BackupData {
  version: 1
  exportedAt: number
  data: {
    articles: unknown[]
    sentences: unknown[]
    analysisResults: unknown[]
    apiProfiles: unknown[]
  }
}

export async function exportBackup(): Promise<string> {
  const [articles, sentences, analysisResults, apiProfiles] = await Promise.all([
    db.articles.toArray(),
    db.sentences.toArray(),
    db.analysisResults.toArray(),
    db.apiProfiles.toArray(),
  ])

  const backup: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    data: { articles, sentences, analysisResults, apiProfiles },
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

  if (backup.version !== 1 || !backup.data) {
    throw new Error("Invalid backup file: unrecognized format")
  }

  const { articles, sentences, analysisResults, apiProfiles } = backup.data

  await db.transaction("rw", [db.articles, db.sentences, db.analysisResults, db.apiProfiles], async () => {
    await db.articles.clear()
    await db.sentences.clear()
    await db.analysisResults.clear()
    await db.apiProfiles.clear()

    if (articles?.length) await db.articles.bulkAdd(articles as never[])
    if (sentences?.length) await db.sentences.bulkAdd(sentences as never[])
    if (analysisResults?.length) await db.analysisResults.bulkAdd(analysisResults as never[])
    if (apiProfiles?.length) await db.apiProfiles.bulkAdd(apiProfiles as never[])
  })

  return {
    articles: articles?.length ?? 0,
    sentences: sentences?.length ?? 0,
  }
}
