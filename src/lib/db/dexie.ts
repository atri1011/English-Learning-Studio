import Dexie, { type EntityTable } from "dexie"
import type { Article, Sentence, AnalysisResult, ApiProfile, VocabularyEntry } from "@/types/db"

class AppDatabase extends Dexie {
  articles!: EntityTable<Article, "id">
  sentences!: EntityTable<Sentence, "id">
  analysisResults!: EntityTable<AnalysisResult, "id">
  apiProfiles!: EntityTable<ApiProfile, "id">
  vocabulary!: EntityTable<VocabularyEntry, "id">

  constructor() {
    super("EnglishLearningStudio")

    this.version(1).stores({
      articles: "&id, updatedAt, status, [status+updatedAt]",
      sentences: "&id, articleId, [articleId+order]",
      analysisResults:
        "&id, &requestHash, articleId, sentenceId, [sentenceId+analysisType], [articleId+analysisType]",
      apiProfiles: "&id, isActive, name",
    })

    this.version(2).stores({
      articles: "&id, updatedAt, status, [status+updatedAt], *tags",
      sentences: "&id, articleId, [articleId+order]",
      analysisResults:
        "&id, &requestHash, articleId, sentenceId, [sentenceId+analysisType], [articleId+analysisType]",
      apiProfiles: "&id, isActive, name",
      vocabulary: "&id, normalizedWord, articleId, sentenceId, createdAt",
    }).upgrade((tx) => {
      return tx.table("articles").toCollection().modify((article) => {
        if (!article.tags) {
          article.tags = []
        }
      })
    })
  }
}

export const db = new AppDatabase()
