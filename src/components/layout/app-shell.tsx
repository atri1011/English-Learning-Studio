import { Outlet, Link, useLocation } from "react-router-dom"
import { BookOpen, Settings, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/stores/ui-store"
import { cn } from "@/lib/utils"

export function AppShell() {
  const location = useLocation()
  const { theme, toggleTheme } = useUIStore()

  const isReaderPage = location.pathname.match(/^\/articles\/[^/]+$/)

  return (
    <div className="flex h-screen overflow-hidden">
      {!isReaderPage && (
        <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar">
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">
              English Studio
            </h1>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <Link to="/articles">
              <Button
                variant={location.pathname.startsWith("/articles") ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-2")}
              >
                <BookOpen className="h-4 w-4" />
                Articles
              </Button>
            </Link>
            <Link to="/settings">
              <Button
                variant={location.pathname === "/settings" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </nav>
          <div className="px-3 py-4 border-t">
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
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
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
            </div>
          </header>
        )}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
