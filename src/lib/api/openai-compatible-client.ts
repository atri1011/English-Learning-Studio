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

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const url = `${request.baseURL.replace(/\/+$/, "")}/v1/chat/completions`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

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

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("Empty response from AI")
    }

    return { content }
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
