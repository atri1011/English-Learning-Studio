import { memo } from "react"
import type { Sentence } from "@/types/db"
import { cn } from "@/lib/utils"
import { WordPopover } from "@/features/analysis/components/word-popover"

interface SentenceItemProps {
  sentence: Sentence
  isSelected: boolean
  onSelect: () => void
}

export const SentenceItem = memo(function SentenceItem({
  sentence,
  isSelected,
  onSelect,
}: SentenceItemProps) {
  if (!isSelected) {
    return (
      <span
        id={`sentence-${sentence.id}`}
        className={cn(
          "inline cursor-pointer rounded-sm transition-colors duration-200",
          "hover:bg-primary/8",
        )}
        onClick={onSelect}
      >
        {sentence.text}{" "}
      </span>
    )
  }

  // 选中状态：拆分为单词级 span，每个单词可点击查询
  const tokens = sentence.text.split(/(\s+|(?=[.,;:!?'")\]])|(?<=[.,;:!?'"(\[]))/)

  return (
    <span
      id={`sentence-${sentence.id}`}
      className={cn(
        "inline cursor-pointer rounded-sm transition-colors duration-200",
        "bg-primary/12 border-b-2 border-primary/40",
      )}
      onClick={onSelect}
    >
      {tokens.map((token, i) => {
        if (!token) return null
        // 空白字符和标点原样渲染
        if (/^\s+$/.test(token) || /^[.,;:!?'"()\[\]]+$/.test(token)) {
          return <span key={i}>{token}</span>
        }
        return (
          <WordPopover key={i} word={token} context={sentence.text} />
        )
      })}
      {" "}
    </span>
  )
})
