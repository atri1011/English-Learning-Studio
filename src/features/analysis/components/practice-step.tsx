import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PracticeItem {
  type: "choice" | "fill" | "translate"
  question: string
  options?: string[]
  answer: string | number
  explanation: string
}

interface PracticeStepProps {
  data: PracticeItem[]
}

type AnswerState = "unanswered" | "correct" | "wrong"

export function PracticeStep({ data }: PracticeStepProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无练习题</p>
  }

  return (
    <div className="space-y-4">
      {data.map((item, i) => (
        <PracticeItemCard key={i} item={item} index={i} />
      ))}
    </div>
  )
}

function PracticeItemCard({ item, index }: { item: PracticeItem; index: number }) {
  const [state, setState] = useState<AnswerState>("unanswered")
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState("")

  const handleChoiceSelect = (optIdx: number) => {
    if (state !== "unanswered") return
    setSelectedOption(optIdx)
    setState(optIdx === item.answer ? "correct" : "wrong")
  }

  const handleSubmitFill = () => {
    if (!inputValue.trim()) return
    const correct = inputValue.trim().toLowerCase() === String(item.answer).toLowerCase()
    setState(correct ? "correct" : "wrong")
  }

  const handleSubmitTranslate = () => {
    // 翻译题直接显示参考答案，不做严格对比
    setState("correct")
  }

  const typeLabel = item.type === "choice" ? "选择题" : item.type === "fill" ? "填空题" : "翻译题"

  return (
    <div
      className={cn(
        "rounded-md border p-3 transition-colors",
        state === "correct" && "border-green-500/50 bg-green-500/5",
        state === "wrong" && "border-red-500/50 bg-red-500/5",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          第 {index + 1} 题 - {typeLabel}
        </span>
      </div>
      <p className="text-sm mb-3">{item.question}</p>

      {/* 选择题 */}
      {item.type === "choice" && item.options && (
        <div className="space-y-1.5">
          {item.options.map((opt, optIdx) => (
            <button
              key={optIdx}
              onClick={() => handleChoiceSelect(optIdx)}
              disabled={state !== "unanswered"}
              className={cn(
                "w-full text-left text-sm px-3 py-2 rounded-md border transition-colors",
                state === "unanswered" && "hover:bg-muted cursor-pointer",
                state !== "unanswered" && optIdx === item.answer && "border-green-500 bg-green-500/10",
                state === "wrong" && optIdx === selectedOption && "border-red-500 bg-red-500/10",
                state !== "unanswered" && optIdx !== item.answer && optIdx !== selectedOption && "opacity-50",
              )}
            >
              {String.fromCharCode(65 + optIdx)}. {opt}
            </button>
          ))}
        </div>
      )}

      {/* 填空题 */}
      {item.type === "fill" && (
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitFill()}
            placeholder="输入你的答案..."
            disabled={state !== "unanswered"}
            className="text-sm"
          />
          {state === "unanswered" && (
            <Button size="sm" onClick={handleSubmitFill}>
              提交
            </Button>
          )}
        </div>
      )}

      {/* 翻译题 */}
      {item.type === "translate" && (
        <div className="space-y-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入你的翻译..."
            disabled={state !== "unanswered"}
            className="w-full text-sm rounded-md border bg-transparent px-3 py-2 min-h-[60px] resize-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
          />
          {state === "unanswered" && (
            <Button size="sm" onClick={handleSubmitTranslate}>
              查看参考答案
            </Button>
          )}
        </div>
      )}

      {/* 反馈区 */}
      {state !== "unanswered" && (
        <div className="mt-3 pt-2 border-t">
          {state === "correct" && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-1">
              {item.type === "translate" ? "参考答案：" : "回答正确！"}
            </p>
          )}
          {state === "wrong" && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-1">
              正确答案: {item.type === "choice" && item.options ? item.options[item.answer as number] : String(item.answer)}
            </p>
          )}
          {(item.type === "translate" && state === "correct") && (
            <p className="text-sm font-serif italic text-primary/80 mb-1">{String(item.answer)}</p>
          )}
          <p className="text-sm text-muted-foreground">{item.explanation}</p>
        </div>
      )}
    </div>
  )
}
