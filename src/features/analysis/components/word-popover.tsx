import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, RotateCw, Star } from "lucide-react"
import { useWordLookupStore } from "@/stores/word-lookup-store"
import { useVocabularyStore } from "@/stores/vocabulary-store"
import { useReaderStore } from "@/stores/reader-store"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface WordPopoverProps {
  word: string
  context: string
}

export function WordPopover({ word, context }: WordPopoverProps) {
  const { lookup, getResult, getError, isWordLoading } = useWordLookupStore()
  const { isWordSaved, addWord, unsaveWord } = useVocabularyStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  const result = getResult(word)
  const error = getError(word)
  const loading = isWordLoading(word)
  const saved = isWordSaved(word)

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

  const handleToggleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (saved) {
      await unsaveWord(word)
      toast("已从生词本移除")
    } else if (result) {
      const sentences = useReaderStore.getState().sentences
      const sentence = sentences.find((s) => s.text === context)
      await addWord({
        word: result.word || word,
        phonetic: result.phonetic || "",
        pos: result.pos || "",
        meaningZh: result.meaningZh || "",
        context,
        articleId: sentence?.articleId ?? "",
        sentenceId: sentence?.id ?? "",
      })
      toast("已添加到生词本")
    }
  }, [saved, result, word, context, unsaveWord, addWord])

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
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-max max-w-[240px] rounded-md border bg-popover p-2 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 duration-100"
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
                <span
                  className="ml-auto cursor-pointer shrink-0"
                  onClick={handleToggleSave}
                  title={saved ? "取消收藏" : "收藏到生词本"}
                >
                  <Star className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    saved ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400",
                  )} />
                </span>
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
          <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-border" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-px border-4 border-transparent border-t-popover" />
        </span>
      )}
    </span>
  )
}
