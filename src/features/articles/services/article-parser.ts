/**
 * Split text into sentences using a regex-based approach.
 * Handles common abbreviations and decimal numbers.
 */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) return []

  // Split on sentence-ending punctuation followed by space or newline
  const raw = normalized.split(/(?<=[.!?])\s+(?=[A-Z"'\u201C\u2018])/)

  return raw
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export interface ParsedSentence {
  text: string
  charStart: number
  charEnd: number
}

export function parseArticle(rawText: string): ParsedSentence[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim()
  if (!normalized) return []

  const sentences = splitSentences(normalized)
  const result: ParsedSentence[] = []
  let searchFrom = 0

  for (const sentence of sentences) {
    const idx = normalized.indexOf(sentence, searchFrom)
    if (idx === -1) continue
    result.push({
      text: sentence,
      charStart: idx,
      charEnd: idx + sentence.length,
    })
    searchFrom = idx + sentence.length
  }

  return result
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
}
