import type { AnalysisType } from "@/types/db"

interface ChatMessage {
  role: "system" | "user"
  content: string
}

const SYSTEM_PROMPT = `You are an expert English linguistics tutor helping Chinese learners.
Return ONLY valid JSON that matches the requested format.
Do not output markdown, comments, or extra keys.
All Chinese explanations should be clear and suitable for language learners.`

export function buildPrompt(type: AnalysisType, sentenceText: string): ChatMessage[] {
  const system: ChatMessage = { role: "system", content: SYSTEM_PROMPT }

  switch (type) {
    case "translation":
      return [
        system,
        {
          role: "user",
          content: `Translate this English sentence to Chinese. Return JSON with this exact format:
{
  "translationZh": "natural Chinese translation",
  "literalZh": "literal/word-by-word Chinese translation",
  "alignments": [
    { "source": "English phrase", "target": "Chinese phrase", "note": "explanation if needed" }
  ]
}

Sentence: "${sentenceText}"`,
        },
      ]

    case "grammar":
      return [
        system,
        {
          role: "user",
          content: `Analyze the grammar of this English sentence. Return JSON with this exact format:
{
  "summary": "Brief grammar summary in Chinese (max 150 chars)",
  "tense": {
    "primary": "tense name in English (e.g. simple_present, past_perfect)",
    "label": "Chinese name of the tense"
  },
  "voice": "active or passive",
  "clauses": [
    {
      "type": "clause type (main/relative/noun/adverbial/conditional etc.)",
      "text": "the clause text",
      "role": "role description in Chinese",
      "label": "Chinese name of clause type"
    }
  ],
  "keyPoints": [
    {
      "title": "Grammar point title in Chinese",
      "explain": "Explanation in Chinese"
    }
  ]
}

Sentence: "${sentenceText}"`,
        },
      ]

    case "constituents":
      return [
        system,
        {
          role: "user",
          content: `Label the sentence constituents (grammatical components). Return JSON with this exact format:
{
  "spans": [
    {
      "label": "S|V|O|Attr|Adv|Comp",
      "text": "the actual text span",
      "labelZh": "Chinese name (主语/谓语/宾语/定语/状语/补语)"
    }
  ],
  "structure": "Brief sentence structure description in Chinese",
  "notes": "Additional notes about the structure in Chinese"
}

Labels: S=Subject, V=Verb/Predicate, O=Object, Attr=Attributive, Adv=Adverbial, Comp=Complement

Sentence: "${sentenceText}"`,
        },
      ]

    case "explanation":
      return [
        system,
        {
          role: "user",
          content: `Provide a detailed pedagogical explanation of this English sentence for Chinese learners. Return JSON with this exact format:
{
  "level": "estimated CEFR level (A1/A2/B1/B2/C1/C2)",
  "grammarPoints": [
    {
      "title": "Grammar point title in Chinese",
      "explain": "Detailed explanation in Chinese",
      "example": "An additional example sentence"
    }
  ],
  "vocabulary": [
    {
      "word": "the word",
      "phonetic": "phonetic transcription",
      "meaningZh": "Chinese meaning",
      "usage": "Usage note in Chinese"
    }
  ],
  "expressionTips": ["Expression tip 1 in Chinese", "Expression tip 2"],
  "pitfalls": ["Common mistake 1 in Chinese"],
  "practice": {
    "question": "A practice question in Chinese",
    "referenceAnswer": "Reference answer"
  }
}

Sentence: "${sentenceText}"`,
        },
      ]
  }
}
