import { useEffect } from "react"
import { useReaderStore } from "@/stores/reader-store"

export function useKeyboardNavigation() {
  const { nextSentence, prevSentence, selectSentence, selectedSentenceId } = useReaderStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) {
        return
      }

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault()
          nextSentence()
          break
        case "k":
        case "ArrowUp":
          e.preventDefault()
          prevSentence()
          break
        case "Escape":
          if (selectedSentenceId) {
            e.preventDefault()
            selectSentence(null)
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [nextSentence, prevSentence, selectSentence, selectedSentenceId])
}
