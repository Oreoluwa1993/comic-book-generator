import OpenAI from "openai"

export type ImageProviderId = "openai" | "together"

export type GeneratedImageResult = { ok: true; imageUrl: string; provider: ImageProviderId } | { ok: false; error: string }

const parseProviderOrder = (raw: string | undefined): ImageProviderId[] => {
  const cleaned = String(raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const mapped = cleaned
    .map((s) => (s === "openai" ? ("openai" as const) : s === "together" ? ("together" as const) : null))
    .filter((v): v is ImageProviderId => Boolean(v))

  // Default: OpenAI first, then Together.
  return mapped.length ? mapped : ["openai", "together"]
}

const isRetryableProviderError = (message: string) => /429|rate|timeout|timed out|overloaded|503|529|ECONNRESET|ETIMEDOUT/i.test(message)

const sizeToWidthHeight = (size: string | undefined): { width: number; height: number } => {
  const raw = String(size ?? "").trim().toLowerCase()
  if (raw === "1536x1024") return { width: 1536, height: 1024 }
  if (raw === "1024x1536") return { width: 1024, height: 1536 }
  if (raw === "1792x1024") return { width: 1792, height: 1024 }
  if (raw === "1024x1792") return { width: 1024, height: 1792 }
  if (raw === "1024x1024") return { width: 1024, height: 1024 }
  // Together doesn’t support "auto" – pick a sane default.
  return { width: 1024, height: 1024 }
}

const generateWithOpenAi = async (input: {
  client: OpenAI
  imageModel: string
  size: string
  prompt: string
  isGptImageModel: boolean
  isDalle3: boolean
}): Promise<GeneratedImageResult> => {
  try {
    const res = await input.client.images.generate({
      model: input.imageModel,
      prompt: input.prompt,
      n: 1,
      size: input.size as never,
      ...(input.isGptImageModel
        ? { quality: "auto" as const, output_format: "png" as const }
        : { quality: (input.isDalle3 ? "hd" : "standard") as "hd" | "standard", response_format: "url" as const }),
    })

    const first = res.data?.[0]
    const url = (first as { url?: string } | undefined)?.url
    const b64 = (first as { b64_json?: string } | undefined)?.b64_json
    if (url) return { ok: true, imageUrl: url, provider: "openai" }
    if (b64) return { ok: true, imageUrl: `data:image/png;base64,${b64}`, provider: "openai" }
    return { ok: false, error: "OpenAI image generation returned no image data." }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const generateWithTogether = async (input: { prompt: string; size: string }): Promise<GeneratedImageResult> => {
  const apiKey = process.env.TOGETHER_API_KEY?.trim()
  if (!apiKey) return { ok: false, error: "Missing TOGETHER_API_KEY." }

  const model = (process.env.TOGETHER_IMAGE_MODEL ?? "black-forest-labs/FLUX.1-schnell-Free").trim()
  const stepsRaw = Number(process.env.TOGETHER_IMAGE_STEPS ?? "20")
  const steps = Number.isFinite(stepsRaw) ? Math.max(1, Math.min(50, Math.floor(stepsRaw))) : 20
  const { width, height } = sizeToWidthHeight(input.size)

  try {
    const res = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        steps,
        width,
        height,
        n: 1,
        response_format: "base64",
        output_format: "png",
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `Together image generation failed (${res.status}). ${text || "No error body."}` }
    }

    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>
    }
    const first = json.data?.[0]
    const b64 = first?.b64_json
    const url = first?.url
    if (b64) return { ok: true, imageUrl: `data:image/png;base64,${b64}`, provider: "together" }
    if (url) return { ok: true, imageUrl: url, provider: "together" }
    return { ok: false, error: "Together image generation returned no image data." }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export const generateImageUrlWithFallbacks = async (input: {
  openaiClient: OpenAI
  openaiModel: string
  openaiSize: string
  prompt: string
}): Promise<GeneratedImageResult> => {
  const order = parseProviderOrder(process.env.IMAGE_PROVIDER_ORDER)
  const isGptImageModel = input.openaiModel.includes("gpt-image") || input.openaiModel.includes("chatgpt-image")
  const isDalle3 = input.openaiModel.includes("dall-e-3") || input.openaiModel.includes("dalle-3")

  let lastError = "Image generation failed."

  for (const provider of order) {
    if (provider === "openai") {
      const res = await generateWithOpenAi({
        client: input.openaiClient,
        imageModel: input.openaiModel,
        size: input.openaiSize,
        prompt: input.prompt,
        isGptImageModel,
        isDalle3,
      })
      if (res.ok) return res
      lastError = res.error
      // Fall back only on transient-ish failures; don’t hide real prompt/safety issues.
      if (!isRetryableProviderError(lastError)) return { ok: false, error: lastError }
      continue
    }

    if (provider === "together") {
      const res = await generateWithTogether({ prompt: input.prompt, size: input.openaiSize })
      if (res.ok) return res
      lastError = res.error
      continue
    }
  }

  return { ok: false, error: lastError }
}

