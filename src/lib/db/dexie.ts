import Dexie, { type EntityTable } from "dexie"
import type { Article, Sentence, AnalysisResult, ApiProfile } from "@/types/db"

class AppDatabase extends Dexie {
  articles!: EntityTable<Article, "id">
  sentences!: EntityTable<Sentence, "id">
  analysisResults!: EntityTable<AnalysisResult, "id">
  apiProfiles!: EntityTable<ApiProfile, "id">

  constructor() {
    super("EnglishLearningStudio")

    this.version(1).stores({
      articles: "&id, updatedAt, status, [status+updatedAt]",
      sentences: "&id, articleId, [articleId+order]",
      analysisResults:
        "&id, &requestHash, articleId, sentenceId, [sentenceId+analysisType], [articleId+analysisType]",
      apiProfiles: "&id, isActive, name",
    })
  }
}

export const db = new AppDatabase()
