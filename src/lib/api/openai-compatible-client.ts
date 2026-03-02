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

function extractContentFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return ""

  const p = payload as {
    choices?: Array<{ message?: { content?: unknown }; delta?: { content?: unknown } }>
    content?: unknown
  }

  const direct = normalizeContent(p.choices?.[0]?.message?.content)
  if (direct) return direct

  const delta = normalizeContent(p.choices?.[0]?.delta?.content)
  if (delta) return delta

  return normalizeContent(p.content)
}

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function extractContentFromSSE(raw: string): string {
  let assembled = ""

  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("data:")) continue

    const dataPart = trimmed.slice(5).trim()
    if (!dataPart || dataPart === "[DONE]") continue

    const payload = tryParseJson(dataPart)
    if (!payload) continue

    if (
      typeof payload === "object" &&
      payload !== null &&
      "choices" in payload
    ) {
      const choice = (payload as { choices?: Array<{ message?: { content?: unknown }; delta?: { content?: unknown } }> }).choices?.[0]
      const delta = normalizeContent(choice?.delta?.content)
      if (delta) {
        assembled += delta
        continue
      }
      const message = normalizeContent(choice?.message?.content)
      if (message) {
        assembled = message
      }
      continue
    }

    const content = extractContentFromPayload(payload)
    if (content) assembled += content
  }

  return assembled.trim()
}

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const url = `${request.baseURL.replace(/\/+$/, "")}/v1/chat/completions`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180_000)

  try {
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
        ...(request.responseFormat ? { response_format: request.responseFormat } : {}),
      }),
      signal: controller.signal,
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

    const raw = await res.text()
    if (!raw.trim()) {
      throw new Error("Empty response from AI")
    }

    const payload = tryParseJson(raw)
    if (payload) {
      const content = extractContentFromPayload(payload)
      if (content) return { content }
    }

    const sseContent = extractContentFromSSE(raw)
    if (sseContent) return { content: sseContent }

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
