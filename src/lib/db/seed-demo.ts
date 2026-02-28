import { db } from "./dexie"
import { createArticle } from "@/features/articles/services/article-repository"

const DEMO_SEEDED_KEY = "demo-seeded"

const DEMO_TEXT = `The most important thing is to enjoy your life — to be happy — it's all that matters. Audrey Hepburn once said that, and it remains true today.

Learning a new language opens doors to different cultures and ways of thinking. When you read in English, you don't just learn words and grammar — you discover how native speakers express their ideas, tell stories, and make arguments.

Research shows that reading extensively is one of the most effective ways to build vocabulary naturally. Unlike memorizing word lists, encountering words in context helps your brain form stronger connections. You begin to understand not just what a word means, but how it feels and when to use it.

Don't be afraid of making mistakes. Every expert was once a beginner. The key is to stay curious, keep reading, and enjoy the journey of learning.`

export async function seedDemoIfNeeded(): Promise<void> {
  if (localStorage.getItem(DEMO_SEEDED_KEY)) return

  const count = await db.articles.count()
  if (count > 0) {
    localStorage.setItem(DEMO_SEEDED_KEY, "1")
    return
  }

  await createArticle("Welcome to English Studio", DEMO_TEXT, "paste")
  localStorage.setItem(DEMO_SEEDED_KEY, "1")
}
