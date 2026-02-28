import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload } from "lucide-react"
import { useArticleStore } from "@/stores/article-store"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

interface ArticleImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArticleImportDialog({ open, onOpenChange }: ArticleImportDialogProps) {
  const navigate = useNavigate()
  const { addArticle } = useArticleStore()
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePasteSubmit = async () => {
    if (!text.trim()) {
      toast.error("请粘贴一些文本")
      return
    }
    setLoading(true)
    const autoTitle = title.trim() || text.trim().slice(0, 50)
    const article = await addArticle(autoTitle, text.trim(), "paste")
    setLoading(false)
    resetForm()
    onOpenChange(false)
    navigate(`/articles/${article.id}`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".txt")) {
      toast.error("仅支持 .txt 文件")
      return
    }
    setLoading(true)
    const content = await file.text()
    if (!content.trim()) {
      toast.error("文件内容为空")
      setLoading(false)
      return
    }
    const autoTitle = title.trim() || file.name.replace(/\.txt$/, "")
    const article = await addArticle(autoTitle, content.trim(), "upload")
    setLoading(false)
    resetForm()
    onOpenChange(false)
    navigate(`/articles/${article.id}`)
  }

  const resetForm = () => {
    setTitle("")
    setText("")
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>导入文章</DialogTitle>
          <DialogDescription>
            粘贴英文文本或上传 .txt 文件，开始学习。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">标题（可选）</Label>
            <Input
              id="title"
              placeholder="留空则自动从内容生成"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <Tabs defaultValue="paste">
            <TabsList className="w-full">
              <TabsTrigger value="paste" className="flex-1">粘贴文本</TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">上传文件</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-3 mt-3">
              <Textarea
                placeholder="在此粘贴英文文章..."
                className="min-h-[200px] max-h-[50vh] font-serif text-base leading-relaxed"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={handlePasteSubmit}
                  disabled={loading || !text.trim()}
                >
                  {loading ? "导入中..." : "导入并阅读"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="upload" className="space-y-3 mt-3">
              <div
                className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  点击选择 .txt 文件
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
