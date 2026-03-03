import { Loader2, CheckCircle2, XCircle, WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSyncStore } from "@/stores/sync-store"
import { useAuthStore } from "@/stores/auth-store"

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return "刚刚"
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  return `${Math.floor(diff / 86400_000)} 天前`
}

export function SyncIndicator() {
  const { user } = useAuthStore()
  const { status, lastSyncAt, errorMessage, pendingCount, triggerSync } = useSyncStore()

  // Don't show anything if not logged in
  if (!user) return null

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {status === "syncing" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>同步中...</span>
        </>
      )}

      {status === "synced" && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span>已同步{lastSyncAt ? ` · ${formatRelativeTime(lastSyncAt)}` : ""}</span>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="truncate max-w-[120px]" title={errorMessage ?? undefined}>
            同步失败
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={triggerSync}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </>
      )}

      {status === "offline" && (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>离线模式</span>
        </>
      )}

      {status === "idle" && pendingCount > 0 && (
        <>
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{pendingCount} 项待同步</span>
        </>
      )}
    </div>
  )
}
