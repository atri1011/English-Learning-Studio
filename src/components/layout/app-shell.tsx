import { useState, useEffect } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { BookOpen, BookMarked, Languages, Settings, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { UserMenu } from "@/features/auth/components/user-menu"
import { SyncIndicator } from "@/components/sync/sync-indicator"
import { MigrationDialog } from "@/components/sync/migration-dialog"
import { detectLocalData } from "@/lib/sync/migration"
import { cn } from "@/lib/utils"

export function AppShell() {
  const location = useLocation()
  const { theme, toggleTheme } = useUIStore()
  const { user } = useAuthStore()
  const [showMigration, setShowMigration] = useState(false)

  const isReaderPage = location.pathname.match(/^\/articles\/[^/]+$/)

  // Check for migration on first login
  useEffect(() => {
    if (!user?.id) return
    const key = `migration-done:${user.id}`
    if (localStorage.getItem(key)) return

    detectLocalData().then((hasData) => {
      if (hasData) {
        setShowMigration(true)
      } else {
        localStorage.setItem(key, "1")
      }
    })
  }, [user?.id])

  const handleMigrationClose = () => {
    setShowMigration(false)
    if (user?.id) {
      localStorage.setItem(`migration-done:${user.id}`, "1")
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {!isReaderPage && (
        <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar">
          <div className="flex items-center justify-between px-6 py-5 border-b">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">
                English Studio
              </h1>
            </div>
            <UserMenu />
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <Link to="/articles">
              <Button
                variant={location.pathname.startsWith("/articles") ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-2")}
              >
                <BookOpen className="h-4 w-4" />
                文章库
              </Button>
            </Link>
            <Link to="/vocabulary">
              <Button
                variant={location.pathname === "/vocabulary" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <BookMarked className="h-4 w-4" />
                生词本
              </Button>
            </Link>
            <Link to="/practice">
              <Button
                variant={location.pathname === "/practice" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <Languages className="h-4 w-4" />
                回译练习
              </Button>
            </Link>
            <Link to="/settings">
              <Button
                variant={location.pathname === "/settings" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <Settings className="h-4 w-4" />
                设置
              </Button>
            </Link>
          </nav>
          <div className="px-3 py-3 border-t space-y-2">
            <SyncIndicator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {theme === "dark" ? "浅色模式" : "深色模式"}
            </Button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {isReaderPage ? null : (
          <header className="flex md:hidden items-center justify-between px-4 py-3 border-b bg-background">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">English Studio</span>
            </div>
            <div className="flex items-center gap-1">
              <SyncIndicator />
              <Link to="/vocabulary">
                <Button variant="ghost" size="icon">
                  <BookMarked className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/practice">
                <Button variant="ghost" size="icon">
                  <Languages className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <UserMenu />
            </div>
          </header>
        )}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {user && (
        <MigrationDialog
          open={showMigration}
          onClose={handleMigrationClose}
          userId={user.id}
        />
      )}
    </div>
  )
}
