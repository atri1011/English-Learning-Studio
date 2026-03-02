import type { AnalysisType } from "@/types/db"

export interface ChatMessage {
  role: "system" | "user" | "assistant"
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
    "label": "Chinese name of the tense",
    "why": "说明为什么判断为这个时态（中文，从句子中的具体线索出发）",
    "signal": "标志词/结构（如 had + 过去分词）"
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
  "level": "difficulty label in Chinese: 容易/中等/较难",
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
  "practice": [
    {
      "type": "choice",
      "question": "选择题问题（中文）",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": 0,
      "explanation": "解释为什么选这个答案（中文）"
    },
    {
      "type": "fill",
      "question": "填空题，用 ___ 表示空格",
      "answer": "correct answer",
      "explanation": "解释（中文）"
    },
    {
      "type": "translate",
      "question": "将下面的中文翻译成英文：一句中文",
      "answer": "English translation",
      "explanation": "翻译要点说明（中文）"
    }
  ]
}

Generate 2-3 practice items of different types (choice/fill/translate) based on the sentence.

Sentence: "${sentenceText}"`,
        },
      ]
  }
}

export function buildFullArticleTranslationPrompt(articleText: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a professional English-to-Chinese translator.
Return ONLY valid JSON. Do not output markdown or any extra text.
Preserve the original meaning, tone, and paragraph boundaries as much as possible.`,
    },
    {
      role: "user",
      content: `Translate the following full English article into natural, fluent Chinese.
Return JSON with this exact format:
{
  "titleZh": "中文标题（可根据原文拟定）",
  "translationZh": "完整中文译文，段落之间用\\n\\n分隔",
  "summaryZh": "一句话中文摘要（不超过60字）"
}

Constraints:
- Keep facts and numbers accurate.
- Do not omit paragraphs.
- Do not add content that is not in the source.

Article:
"""${articleText}"""`,
    },
  ]
}

export function buildWordLookupPrompt(word: string, context: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: "You are a concise English dictionary for Chinese learners. Return ONLY valid JSON.",
    },
    {
      role: "user",
      content: `Translate this English word as used in the given sentence context.
Return JSON: { "word": "${word}", "phonetic": "/.../ ", "pos": "词性（如：名词/动词/形容词/副词/介词/连词）", "meaningZh": "在本句中的中文释义" }
Word: "${word}"
Sentence: "${context}"`,
    },
  ]
}

export function buildChatPrompt(
  sentenceText: string,
  analysisContext: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
): ChatMessage[] {
  const system: ChatMessage = {
    role: "system",
    content: `你是一位专业的英语语言学辅导老师，正在帮助中国学生理解一个英语句子。
用中文回答，简洁易懂。

当前句子：
"${sentenceText}"

${analysisContext ? `已有分析结果：\n${analysisContext}\n` : ""}
请基于以上句子上下文回答学生的问题。如果学生的问题与当前句子无关，礼貌地引导回来。`,
  }

  return [system, ...chatHistory.map((m) => ({ ...m, role: m.role as ChatMessage["role"] }))]
}
