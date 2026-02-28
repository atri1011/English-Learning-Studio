import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, RotateCw } from "lucide-react"
import { useWordLookupStore } from "@/stores/word-lookup-store"
import { cn } from "@/lib/utils"

interface WordPopoverProps {
  word: string
  context: string
}

export function WordPopover({ word, context }: WordPopoverProps) {
  const { lookup, getResult, getError, isWordLoading } = useWordLookupStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  const result = getResult(word)
  const error = getError(word)
  const loading = isWordLoading(word)

  // 打开时触发查询（与 setOpen 分离，避免在 state updater 中调用异步函数）
  useEffect(() => {
    if (open && !result && !loading && !error) {
      lookup(word, context)
    }
  }, [open, word, context, result, loading, error, lookup])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setOpen((prev) => !prev)
  }, [])

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    lookup(word, context)
  }, [word, context, lookup])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <span ref={ref} className="relative inline">
      <span
        className={cn(
          "cursor-pointer rounded-sm px-0.5 transition-colors",
          "hover:bg-primary/15 hover:text-primary",
          open && "bg-primary/20 text-primary",
        )}
        onClick={handleClick}
      >
        {word}
      </span>
      {open && (
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-max max-w-[220px] rounded-md border bg-popover p-2 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">查询中...</span>
            </span>
          ) : result ? (
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold font-serif">{result.word}</span>
                {result.phonetic && (
                  <span className="text-[11px] text-muted-foreground">{result.phonetic}</span>
                )}
                <span className="text-[11px] text-primary/80">{result.pos}</span>
              </span>
              <span className="text-sm leading-snug">{result.meaningZh}</span>
            </span>
          ) : error ? (
            <span className="flex flex-col gap-1">
              <span className="text-xs text-destructive">{error}</span>
              <span
                className="flex items-center gap-1 text-xs text-primary cursor-pointer hover:underline"
                onClick={handleRetry}
              >
                <RotateCw className="h-3 w-3" />
                重试
              </span>
            </span>
          ) : null}
          {/* 小三角箭头 */}
          <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-border" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-px border-4 border-transparent border-t-popover" />
        </span>
      )}
    </span>
  )
}
