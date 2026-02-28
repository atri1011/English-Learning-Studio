import { create } from "zustand"
import type { Article } from "@/types/db"
import {
  getAllArticles,
  createArticle as repoCreate,
  deleteArticle as repoDelete,
  updateArticleTitle as repoUpdateTitle,
} from "@/features/articles/services/article-repository"

interface ArticleState {
  articles: Article[]
  loading: boolean
  loadArticles: () => Promise<void>
  addArticle: (title: string, rawText: string, sourceType: "paste" | "upload") => Promise<Article>
  removeArticle: (id: string) => Promise<void>
  renameArticle: (id: string, title: string) => Promise<void>
}

export const useArticleStore = create<ArticleState>()((set) => ({
  articles: [],
  loading: false,

  loadArticles: async () => {
    set({ loading: true })
    const articles = await getAllArticles()
    set({ articles, loading: false })
  },

  addArticle: async (title, rawText, sourceType) => {
    const article = await repoCreate(title, rawText, sourceType)
    set((s) => ({ articles: [article, ...s.articles] }))
    return article
  },

  removeArticle: async (id) => {
    await repoDelete(id)
    set((s) => ({ articles: s.articles.filter((a) => a.id !== id) }))
  },

  renameArticle: async (id, title) => {
    await repoUpdateTitle(id, title)
    set((s) => ({
      articles: s.articles.map((a) =>
        a.id === id ? { ...a, title, updatedAt: Date.now() } : a,
      ),
    }))
  },
}))
