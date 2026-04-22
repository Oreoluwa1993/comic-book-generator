import { NextResponse } from "next/server"
import { captureInspirationsFromBrowser } from "@/app/inspirations/actions"

export const runtime = "nodejs"

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as unknown
    const items = Array.isArray((body as any)?.items) ? ((body as any).items as unknown[]) : []
    const parsed = items
      .map((x) => {
        const o = x as any
        return {
          sourceUrl: typeof o?.sourceUrl === "string" ? o.sourceUrl : undefined,
          imageUrl: typeof o?.imageUrl === "string" ? o.imageUrl : "",
          title: typeof o?.title === "string" ? o.title : undefined,
        }
      })
      .filter((x) => Boolean(x.imageUrl))

    const result = await captureInspirationsFromBrowser(parsed)
    if (!result.ok) return NextResponse.json(result, { status: 400 })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to capture inspirations." },
      { status: 500 }
    )
  }
}

