interface LLMRequest {
  baseURL: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  responseFormat?: { type: string }
}

interface LLMResponse {
  content: string
}

interface ResponseParseResult {
  content: string
  error: string | null
  usageOnlyChunk: boolean
}

function normalizeContent(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item
        if (!item || typeof item !== "object") return ""
        const maybeText = (item as { text?: unknown }).text
        if (typeof maybeText === "string") return maybeText
        const maybeContent = (item as { content?: unknown }).content
        if (typeof maybeContent === "string") return maybeContent
        return ""
      })
      .join("")
  }
  return ""
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const err = (payload as { error?: unknown }).error
  if (!err) return null

  if (typeof err === "string") {
    const msg = err.trim()
    return msg || "LLM returned an unknown error."
  }

  if (typeof err !== "object") return "LLM returned an unknown error."

  const e = err as { message?: unknown; code?: unknown; type?: unknown }
  const message = typeof e.message === "string" ? e.message.trim() : ""
  const code = typeof e.code === "string" ? e.code.trim() : ""
  const type = typeof e.type === "string" ? e.type.trim() : ""

  if (message && code) return `${message} (${code})`
  if (message) return message
  if (code && type) return `${type}: ${code}`
  if (code) return `LLM error code: ${code}`
  if (type) return `LLM error type: ${type}`
  return "LLM returned an unknown error."
}

function extractChoiceContent(choice: unknown): string {
  if (!choice || typeof choice !== "object") return ""
  const c = choice as {
    message?: { content?: unknown }
    delta?: { content?: unknown; text?: unknown }
    text?: unknown
  }

  const message = normalizeContent(c.message?.content)
  if (message) return message

  const delta = normalizeContent(c.delta?.content)
  if (delta) return delta

  const deltaText = normalizeContent(c.delta?.text)
  if (deltaText) return deltaText

  return normalizeContent(c.text)
}

function extractContentFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return ""

  const p = payload as {
    choices?: unknown[]
    content?: unknown
  }

  if (Array.isArray(p.choices)) {
    for (const choice of p.choices) {
      const text = extractChoiceContent(choice)
      if (text) return text
    }
  }

  return normalizeContent(p.content)
}

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  const parsed = tryParseJson(raw)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  return parsed as Record<string, unknown>
}

function parseJsonObjectFromCodeBlock(content: string): Record<string, unknown> | null {
  const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)\s*```/gi
  let match: RegExpExecArray | null = null

  while ((match = codeBlockPattern.exec(content)) !== null) {
    const candidate = match[1]?.trim()
    if (!candidate) continue
    const parsed = tryParseJsonObject(candidate)
    if (parsed) return parsed
  }

  return null
}

function parseFirstBalancedJsonObject(content: string): Record<string, unknown> | null {
  for (let start = 0; start < content.length; start++) {
    if (content[start] !== "{") continue

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < content.length; i++) {
      const ch = content[i]

      if (inString) {
        if (escaped) {
          escaped = false
          continue
        }
        if (ch === "\\") {
          escaped = true
          continue
        }
        if (ch === "\"") {
          inString = false
        }
        continue
      }

      if (ch === "\"") {
        inString = true
        continue
      }

      if (ch === "{") {
        depth += 1
        continue
      }

      if (ch === "}") {
        depth -= 1
        if (depth === 0) {
          const parsed = tryParseJsonObject(content.slice(start, i + 1))
          if (parsed) return parsed
          break
        }
      }
    }
  }

  return null
}

export function extractJsonObjectFromText(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  const direct = tryParseJsonObject(trimmed)
  if (direct) return direct

  const fromCodeBlock = parseJsonObjectFromCodeBlock(content)
  if (fromCodeBlock) return fromCodeBlock

  const fromBalanced = parseFirstBalancedJsonObject(content)
  if (fromBalanced) return fromBalanced

  throw new Error(`Failed to parse AI response as JSON object: ${content.slice(0, 200)}`)
}

function extractContentFromSSE(raw: string): ResponseParseResult {
  let assembled = ""
  let error: string | null = null
  let usageOnlyChunk = false

  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("data:")) continue

    const dataPart = trimmed.slice(5).trim()
    if (!dataPart || dataPart === "[DONE]") continue

    const payload = tryParseJson(dataPart)
    if (!payload) continue

    const payloadError = extractErrorMessage(payload)
    if (payloadError) {
      error = payloadError
      continue
    }

    if (
      typeof payload === "object" &&
      payload !== null &&
      "choices" in payload
    ) {
      const choices = Array.isArray((payload as { choices?: unknown[] }).choices)
        ? (payload as { choices: unknown[] }).choices
        : []

      if (choices.length === 0) {
        if (
          typeof payload === "object" &&
          payload !== null &&
          "usage" in payload
        ) {
          usageOnlyChunk = true
        }
        continue
      }

      for (const choice of choices) {
        const text = extractChoiceContent(choice)
        if (text) {
          assembled += text
        }
      }
      continue
    }

    const content = extractContentFromPayload(payload)
    if (content) assembled += content
  }

  return {
    content: assembled.trim(),
    error,
    usageOnlyChunk,
  }
}

function parseResponse(raw: string): ResponseParseResult {
  const payload = tryParseJson(raw)
  if (payload) {
    const error = extractErrorMessage(payload)
    if (error) {
      return { content: "", error, usageOnlyChunk: false }
    }
    const content = extractContentFromPayload(payload).trim()
    if (content) {
      return { content, error: null, usageOnlyChunk: false }
    }
  }

  return extractContentFromSSE(raw)
}

async function postChatCompletions(
  request: LLMRequest,
  includeResponseFormat: boolean,
  signal: AbortSignal,
): Promise<string> {
  const url = `${request.baseURL.replace(/\/+$/, "")}/v1/chat/completions`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false,
      ...(includeResponseFormat && request.responseFormat ? { response_format: request.responseFormat } : {}),
    }),
    signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Authentication failed (${res.status}). Check your API key.`)
    }
    if (res.status === 429) {
      throw new Error("Rate limited. Please wait and try again.")
    }
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`)
  }

  return res.text()
}

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180_000)

  try {
    const raw = await postChatCompletions(request, true, controller.signal)
    if (!raw.trim()) {
      throw new Error("Empty response from AI")
    }

    const parsed = parseResponse(raw)
    if (parsed.content) return { content: parsed.content }

    if (request.responseFormat) {
      const retryRaw = await postChatCompletions(request, false, controller.signal)
      if (!retryRaw.trim()) {
        throw new Error("Empty response from AI")
      }
      const retryParsed = parseResponse(retryRaw)
      if (retryParsed.content) return { content: retryParsed.content }
      if (retryParsed.error) throw new Error(retryParsed.error)
      if (retryParsed.usageOnlyChunk) {
        throw new Error("AI returned no completion text (completion_tokens=0). Please increase max tokens or try another model.")
      }
      throw new Error(`Failed to parse AI response: ${retryRaw.slice(0, 200)}`)
    }

    if (parsed.error) throw new Error(parsed.error)
    if (parsed.usageOnlyChunk) {
      throw new Error("AI returned no completion text (completion_tokens=0). Please increase max tokens or try another model.")
    }

    throw new Error(`Failed to parse AI response: ${raw.slice(0, 200)}`)
  } finally {
    clearTimeout(timeout)
  }
}

export async function testConnection(
  baseURL: string,
  apiKey: string,
  model: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await callLLM({
      baseURL,
      apiKey,
      model,
      temperature: 0,
      maxTokens: 20,
      messages: [{ role: "user", content: "Say ok" }],
    })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Connection failed",
    }
  }
}
