import { useState, useRef, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, X, Loader2, Globe } from "lucide-react"
import { useArticleStore } from "@/stores/article-store"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

interface ArticleImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function stripMarkdown(md: string): string {
  return md
    // Remove headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Remove blockquotes marker
    .replace(/^>\s+/gm, "")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function fetchArticleFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  // Remove scripts, styles, nav, footer, header
  doc.querySelectorAll("script, style, nav, footer, header, aside, iframe").forEach((el) => el.remove())
  // Try article or main content first
  const article = doc.querySelector("article") || doc.querySelector("main") || doc.querySelector(".content") || doc.body
  return (article.textContent || "").replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

export function ArticleImportDialog({ open, onOpenChange }: ArticleImportDialogProps) {
  const navigate = useNavigate()
  const { addArticle, getAllTags } = useArticleStore()
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [url, setUrl] = useState("")
  const [urlLoading, setUrlLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const existingTags = getAllTags()

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput("")
  }, [tags])

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(tagInput)
    }
  }, [tagInput, addTag])

  const handlePasteSubmit = async () => {
    if (!text.trim()) {
      toast.error("请粘贴一些文本")
      return
    }
    setLoading(true)
    const autoTitle = title.trim() || text.trim().slice(0, 50)
    const article = await addArticle(autoTitle, text.trim(), "paste", tags)
    setLoading(false)
    resetForm()
    onOpenChange(false)
    navigate(`/articles/${article.id}`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isMd = file.name.endsWith(".md")
    const isTxt = file.name.endsWith(".txt")
    if (!isTxt && !isMd) {
      toast.error("仅支持 .txt 或 .md 文件")
      return
    }
    setLoading(true)
    let content = await file.text()
    if (!content.trim()) {
      toast.error("文件内容为空")
      setLoading(false)
      return
    }
    if (isMd) {
      content = stripMarkdown(content)
    }
    const autoTitle = title.trim() || file.name.replace(/\.(txt|md)$/, "")
    const sourceType = isMd ? "md" as const : "upload" as const
    const article = await addArticle(autoTitle, content.trim(), sourceType, tags)
    setLoading(false)
    resetForm()
    onOpenChange(false)
    navigate(`/articles/${article.id}`)
  }

  const handleUrlFetch = async () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      toast.error("请输入 URL")
      return
    }
    let validUrl: string
    try {
      validUrl = new URL(trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`).href
    } catch {
      toast.error("URL 格式不正确")
      return
    }
    setUrlLoading(true)
    try {
      const content = await fetchArticleFromUrl(validUrl)
      if (!content || content.length < 20) {
        toast.error("未能从该页面提取到有效内容，请尝试粘贴文本导入")
        return
      }
      setText(content)
      if (!title.trim()) {
        setTitle(content.slice(0, 50))
      }
      toast.success("内容已提取，请检查后点击导入")
    } catch {
      toast.error("无法访问该 URL（可能存在跨域限制），请直接复制网页文本后粘贴导入")
    } finally {
      setUrlLoading(false)
    }
  }

  const handleUrlSubmit = async () => {
    if (!text.trim()) {
      toast.error("请先提取内容")
      return
    }
    setLoading(true)
    const autoTitle = title.trim() || text.trim().slice(0, 50)
    const article = await addArticle(autoTitle, text.trim(), "url", tags)
    setLoading(false)
    resetForm()
    onOpenChange(false)
    navigate(`/articles/${article.id}`)
  }

  const resetForm = () => {
    setTitle("")
    setText("")
    setTags([])
    setTagInput("")
    setUrl("")
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>导入文章</DialogTitle>
          <DialogDescription>
            粘贴英文文本、上传文件或从 URL 导入，开始学习。
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

          {/* Tags Input */}
          <div className="space-y-2">
            <Label>标签（可选）</Label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Input
                placeholder="输入标签后按 Enter 添加"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
              />
              {tagInput && existingTags.filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)).length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover p-1 shadow-md">
                  {existingTags
                    .filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
                    .slice(0, 5)
                    .map((t) => (
                      <button
                        key={t}
                        className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted"
                        onClick={() => addTag(t)}
                      >
                        {t}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue="paste">
            <TabsList className="w-full">
              <TabsTrigger value="paste" className="flex-1">粘贴文本</TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">上传文件</TabsTrigger>
              <TabsTrigger value="url" className="flex-1">URL 导入</TabsTrigger>
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
                  点击选择 .txt 或 .md 文件
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-3 mt-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()}
                  />
                </div>
                <Button
                  onClick={handleUrlFetch}
                  disabled={urlLoading || !url.trim()}
                  variant="outline"
                >
                  {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "提取"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                部分网站可能因跨域限制无法提取，可改用粘贴文本导入
              </p>
              {text && (
                <>
                  <Textarea
                    placeholder="提取的内容..."
                    className="min-h-[150px] max-h-[40vh] font-serif text-sm leading-relaxed"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <DialogFooter>
                    <Button
                      onClick={handleUrlSubmit}
                      disabled={loading || !text.trim()}
                    >
                      {loading ? "导入中..." : "导入并阅读"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
