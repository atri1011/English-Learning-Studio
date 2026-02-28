import Dexie from "dexie"
import { db } from "@/lib/db/dexie"
import type { Article, Sentence } from "@/types/db"
import { parseArticle, countWords } from "./article-parser"

function generateId(): string {
  return crypto.randomUUID()
}

export async function createArticle(
  title: string,
  rawText: string,
  sourceType: "paste" | "upload",
): Promise<Article> {
  const now = Date.now()
  const parsed = parseArticle(rawText)

  const article: Article = {
    id: generateId(),
    title,
    rawText,
    sourceType,
    wordCount: countWords(rawText),
    sentenceCount: parsed.length,
    status: "ready",
    createdAt: now,
    updatedAt: now,
  }

  const sentences: Sentence[] = parsed.map((s, i) => ({
    id: generateId(),
    articleId: article.id,
    order: i,
    text: s.text,
    charStart: s.charStart,
    charEnd: s.charEnd,
  }))

  await db.transaction("rw", [db.articles, db.sentences], async () => {
    await db.articles.add(article)
    await db.sentences.bulkAdd(sentences)
  })

  return article
}

export async function getAllArticles(): Promise<Article[]> {
  return db.articles.orderBy("updatedAt").reverse().toArray()
}

export async function getArticle(id: string): Promise<Article | undefined> {
  return db.articles.get(id)
}

export async function getSentences(articleId: string): Promise<Sentence[]> {
  return db.sentences.where("[articleId+order]").between([articleId, Dexie.minKey], [articleId, Dexie.maxKey]).toArray()
}

export async function updateArticleTitle(
  id: string,
  title: string,
): Promise<void> {
  await db.articles.update(id, { title, updatedAt: Date.now() })
}

export async function deleteArticle(id: string): Promise<void> {
  await db.transaction("rw", [db.articles, db.sentences, db.analysisResults], async () => {
    const sentenceIds = await db.sentences
      .where("articleId")
      .equals(id)
      .primaryKeys()
    await db.analysisResults.where("articleId").equals(id).delete()
    await db.sentences.bulkDelete(sentenceIds)
    await db.articles.delete(id)
  })
}
