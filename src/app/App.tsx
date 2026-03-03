import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/layout/app-shell"
import { ArticlesPage } from "@/features/articles/pages/articles-page"
import { ArticleDetailPage } from "@/features/articles/pages/article-detail-page"
import { VocabularyPage } from "@/features/vocabulary/pages/vocabulary-page"
import { SettingsPage } from "@/features/settings/pages/settings-page"
import { PracticePage } from "@/features/practice/pages/practice-page"
import { LoginPage } from "@/features/auth/pages/login-page"
import { seedDemoIfNeeded } from "@/lib/db/seed-demo"
import { useAuthStore } from "@/stores/auth-store"
import { installSyncHooks } from "@/lib/sync/sync-hooks"
import { syncEngine } from "@/lib/sync/sync-engine"
import { isSupabaseConfigured } from "@/lib/supabase/client"

// Install Dexie sync hooks once at module load
installSyncHooks()

export function App() {
  const { initialize, user } = useAuthStore()

  useEffect(() => {
    seedDemoIfNeeded()
    if (isSupabaseConfigured()) {
      initialize()
    }
  }, [initialize])

  // Start/stop sync engine based on auth state
  useEffect(() => {
    if (user?.id) {
      syncEngine.start(user.id)
    } else {
      syncEngine.stop()
    }
    return () => syncEngine.stop()
  }, [user?.id])

  return (
    <BrowserRouter>
      <TooltipProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/articles" replace />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:articleId" element={<ArticleDetailPage />} />
            <Route path="/vocabulary" element={<VocabularyPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  )
}
