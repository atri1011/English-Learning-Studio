import { create } from "zustand"
import type { Article } from "@/types/db"
import {
  getAllArticles,
  createArticle as repoCreate,
  deleteArticle as repoDelete,
  updateArticleTitle as repoUpdateTitle,
  updateArticleTags as repoUpdateTags,
  getAllArticleProgress,
  type ArticleProgress,
} from "@/features/articles/services/article-repository"

interface ArticleState {
  articles: Article[]
  loading: boolean
  loadError: string | null
  tagFilter: string | null
  progressMap: Record<string, ArticleProgress>
  loadArticles: () => Promise<void>
  addArticle: (title: string, rawText: string, sourceType: "paste" | "upload" | "url" | "md", tags?: string[]) => Promise<Article>
  removeArticle: (id: string) => Promise<void>
  renameArticle: (id: string, title: string) => Promise<void>
  updateTags: (id: string, tags: string[]) => Promise<void>
  setTagFilter: (tag: string | null) => void
  getAllTags: () => string[]
  getProgress: (articleId: string) => ArticleProgress | undefined
}

export const useArticleStore = create<ArticleState>()((set, get) => ({
  articles: [],
  loading: false,
  loadError: null,
  tagFilter: null,
  progressMap: {},

  loadArticles: async () => {
    set({ loading: true, loadError: null })
    try {
      const [articles, progressMap] = await Promise.all([
        getAllArticles(),
        getAllArticleProgress(),
      ])
      set({ articles, progressMap })
    } catch (error) {
      console.error("Failed to load articles:", error)
      set({ loadError: "加载文章失败，请刷新页面重试" })
    } finally {
      set({ loading: false })
    }
  },

  addArticle: async (title, rawText, sourceType, tags = []) => {
    const article = await repoCreate(title, rawText, sourceType, tags)
    set((s) => ({ articles: [article, ...s.articles] }))
    return article
  },

  removeArticle: async (id) => {
    await repoDelete(id)
    set((s) => ({
      articles: s.articles.filter((a) => a.id !== id),
      progressMap: Object.fromEntries(
        Object.entries(s.progressMap).filter(([k]) => k !== id),
      ),
    }))
  },

  renameArticle: async (id, title) => {
    await repoUpdateTitle(id, title)
    set((s) => ({
      articles: s.articles.map((a) =>
        a.id === id ? { ...a, title, updatedAt: Date.now() } : a,
      ),
    }))
  },

  updateTags: async (id, tags) => {
    await repoUpdateTags(id, tags)
    set((s) => ({
      articles: s.articles.map((a) =>
        a.id === id ? { ...a, tags, updatedAt: Date.now() } : a,
      ),
    }))
  },

  setTagFilter: (tag) => {
    set({ tagFilter: tag })
  },

  getAllTags: () => {
    const { articles } = get()
    const tagSet = new Set<string>()
    for (const a of articles) {
      if (a.tags) {
        for (const t of a.tags) tagSet.add(t)
      }
    }
    return Array.from(tagSet).sort()
  },

  getProgress: (articleId) => {
    return get().progressMap[articleId]
  },
}))
