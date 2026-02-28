import { memo } from "react"
import type { Sentence } from "@/types/db"
import { cn } from "@/lib/utils"

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
  return (
    <span
      id={`sentence-${sentence.id}`}
      className={cn(
        "inline cursor-pointer rounded-sm transition-colors duration-200",
        "hover:bg-primary/8",
        isSelected && "bg-primary/12 border-b-2 border-primary/40",
      )}
      onClick={onSelect}
    >
      {sentence.text}{" "}
    </span>
  )
})
