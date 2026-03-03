import { useState } from "react"
import { Loader2, Upload, Download, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { uploadLocal, downloadCloud, type MigrationProgress } from "@/lib/sync/migration"
import { toast } from "sonner"

interface MigrationDialogProps {
  open: boolean
  onClose: () => void
  userId: string
}

type Strategy = "upload" | "download" | "skip"

const TABLE_LABELS: Record<string, string> = {
  articles: "文章",
  sentences: "句子",
  analysisResults: "分析结果",
  vocabulary: "生词本",
  practiceMaterials: "练习素材",
  practiceAttempts: "练习记录",
  apiProfiles: "API 配置",
}

export function MigrationDialog({ open, onClose, userId }: MigrationDialogProps) {
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState<MigrationProgress | null>(null)

  const handleMigrate = async (strategy: Strategy) => {
    if (strategy === "skip") {
      onClose()
      return
    }

    setMigrating(true)
    try {
      if (strategy === "upload") {
        await uploadLocal(userId, setProgress)
        toast.success("本地数据已上传到云端")
      } else {
        await downloadCloud(userId, setProgress)
        toast.success("已从云端恢复数据")
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "迁移失败")
    } finally {
      setMigrating(false)
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !migrating && onClose()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => migrating && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>数据同步</DialogTitle>
          <DialogDescription>
            检测到本地已有学习数据，请选择同步方式
          </DialogDescription>
        </DialogHeader>

        {migrating && progress ? (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                正在迁移: {TABLE_LABELS[progress.table] ?? progress.table}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: progress.total > 0
                    ? `${Math.round((progress.current / progress.total) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {progress.current} / {progress.total}
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <Button
              variant="default"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleMigrate("upload")}
            >
              <Upload className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">上传本地数据到云端</div>
                <div className="text-xs font-normal opacity-80">推荐 - 保留现有数据并开启同步</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleMigrate("download")}
            >
              <Download className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">从云端恢复</div>
                <div className="text-xs font-normal text-muted-foreground">覆盖本地数据，使用云端版本</div>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleMigrate("skip")}
            >
              <Clock className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">暂不同步</div>
                <div className="text-xs font-normal text-muted-foreground">保持本地数据，稍后再决定</div>
              </div>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
