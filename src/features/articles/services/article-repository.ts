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
  sourceType: "paste" | "upload" | "url" | "md",
  tags: string[] = [],
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
    tags,
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

export async function updateArticleTags(
  id: string,
  tags: string[],
): Promise<void> {
  await db.articles.update(id, { tags, updatedAt: Date.now() })
}

export async function deleteArticle(id: string): Promise<void> {
  await db.transaction("rw", [db.articles, db.sentences, db.analysisResults, db.vocabulary], async () => {
    const sentenceIds = await db.sentences
      .where("articleId")
      .equals(id)
      .primaryKeys()
    await db.analysisResults.where("articleId").equals(id).delete()
    await db.vocabulary.where("articleId").equals(id).delete()
    await db.sentences.bulkDelete(sentenceIds)
    await db.articles.delete(id)
  })
}

export interface ArticleProgress {
  analyzed: number
  total: number
}

export async function getArticleProgress(articleId: string): Promise<ArticleProgress> {
  const sentenceIds = await db.sentences
    .where("articleId")
    .equals(articleId)
    .primaryKeys()

  if (sentenceIds.length === 0) return { analyzed: 0, total: 0 }

  const analyzedSet = new Set<string>()
  const results = await db.analysisResults
    .where("articleId")
    .equals(articleId)
    .toArray()

  for (const r of results) {
    if (r.status === "success") {
      if (r.sentenceId.startsWith("article:")) continue
      analyzedSet.add(r.sentenceId)
    }
  }

  return {
    analyzed: analyzedSet.size,
    total: sentenceIds.length,
  }
}

export async function getAllArticleProgress(): Promise<Record<string, ArticleProgress>> {
  const articles = await db.articles.toArray()
  const progressMap: Record<string, ArticleProgress> = {}

  // analysisResults 当前 schema 没有 status 索引，不能用 where("status")
  const allResults = await db.analysisResults.toArray()

  // Build articleId -> Set<sentenceId> map
  const analyzedByArticle = new Map<string, Set<string>>()
  for (const r of allResults) {
    if (r.status !== "success") continue
    if (r.sentenceId.startsWith("article:")) continue
    let set = analyzedByArticle.get(r.articleId)
    if (!set) {
      set = new Set()
      analyzedByArticle.set(r.articleId, set)
    }
    set.add(r.sentenceId)
  }

  for (const a of articles) {
    progressMap[a.id] = {
      analyzed: analyzedByArticle.get(a.id)?.size ?? 0,
      total: a.sentenceCount,
    }
  }

  return progressMap
}
