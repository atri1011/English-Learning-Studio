import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface MaterialCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: { title: string; sourceText: string; promptText: string }) => void
}

export function MaterialCreateDialog({ open, onOpenChange, onSubmit }: MaterialCreateDialogProps) {
  const [title, setTitle] = useState("")
  const [sourceText, setSourceText] = useState("")
  const [promptText, setPromptText] = useState("")

  const canSubmit = title.trim() && sourceText.trim() && promptText.trim()

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      title: title.trim(),
      sourceText: sourceText.trim(),
      promptText: promptText.trim(),
    })
    setTitle("")
    setSourceText("")
    setPromptText("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建回译素材</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              placeholder="给这篇素材起个名字..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceText">英文原文</Label>
            <Textarea
              id="sourceText"
              placeholder="粘贴英文原文..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="min-h-[120px] font-serif"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promptText">中文翻译</Label>
            <Textarea
              id="promptText"
              placeholder="粘贴对应的中文翻译..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
