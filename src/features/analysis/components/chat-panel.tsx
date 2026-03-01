import { useState, useEffect, useRef, useCallback } from "react"
import Markdown from "react-markdown"
import { Send, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { callLLM } from "@/lib/api/openai-compatible-client"
import { useSettingsStore } from "@/stores/settings-store"
import { useAnalysisStore } from "@/stores/analysis-store"
import { buildChatPrompt } from "@/features/analysis/services/prompt-builder"
import type { AnalysisType } from "@/types/db"
import type { Sentence } from "@/types/db"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ChatPanelProps {
  sentence: Sentence
}

const ANALYSIS_TYPES: AnalysisType[] = ["translation", "grammar", "constituents", "explanation"]

function buildAnalysisContext(sentenceId: string): string {
  const { getResult } = useAnalysisStore.getState()
  const parts: string[] = []

  for (const type of ANALYSIS_TYPES) {
    const result = getResult(sentenceId, type)
    if (result?.status === "success" && result.resultJson) {
      const json = result.resultJson
      switch (type) {
        case "translation":
          if (json.translationZh) parts.push(`翻译: ${json.translationZh}`)
          break
        case "grammar":
          if (json.summary) parts.push(`语法: ${json.summary}`)
          break
        case "constituents":
          if (json.structure) parts.push(`句子结构: ${json.structure}`)
          break
        case "explanation":
          if (json.level) parts.push(`难度: ${json.level}`)
          break
      }
    }
  }

  return parts.join("\n")
}

export function ChatPanel({ sentence }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 切换句子时重置所有状态
  useEffect(() => {
    setMessages([])
    setInput("")
    setLoading(false)
    setError(null)
  }, [sentence.id])

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const profile = useSettingsStore.getState().getActiveProfile()
    if (!profile) {
      setError("未配置 API，请先在设置中添加 API 配置")
      return
    }

    const userMsg: ChatMessage = { role: "user", content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setError(null)
    setLoading(true)

    try {
      const analysisContext = buildAnalysisContext(sentence.id)
      const prompt = buildChatPrompt(sentence.text, analysisContext, nextMessages)

      const response = await callLLM({
        baseURL: profile.baseURL,
        apiKey: profile.apiKey,
        model: profile.model,
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
        messages: prompt,
      })

      setMessages((prev) => [...prev, { role: "assistant", content: response.content }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              针对当前句子提问，例如：
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              "为什么用过去时？" "这个词还有什么用法？"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "user" ? (
              <div className="rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap bg-primary text-primary-foreground">
                {msg.content}
              </div>
            ) : (
              <div className="rounded-lg px-3 py-2 max-w-[85%] text-sm bg-muted prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <Markdown>{msg.content}</Markdown>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* 输入区域 */}
      <div className="shrink-0 border-t p-3 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          className="min-h-[36px] max-h-[120px] resize-none text-sm"
          rows={1}
          disabled={loading}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
