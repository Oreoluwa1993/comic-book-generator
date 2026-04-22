import path from "node:path"
import { readFile } from "node:fs/promises"

const readText = async (absolutePath: string) => {
  const buf = await readFile(absolutePath)
  return buf.toString("utf8")
}

const takeHeadTail = (text: string, opts: { headChars: number; tailChars: number }) => {
  const cleaned = text.replaceAll("\r\n", "\n")
  if (cleaned.length <= opts.headChars + opts.tailChars + 200) return cleaned
  const head = cleaned.slice(0, opts.headChars)
  const tail = cleaned.slice(-opts.tailChars)
  return `${head}\n\n/* ... truncated ... */\n\n${tail}`
}

export type LayoutReviewContext = {
  repo: {
    framework: string
    styling: string
    ui: string[]
    constraints: string[]
  }
  files: Array<{
    path: string
    excerpt: string
  }>
}

export const buildLayoutReviewContext = async (repoRoot: string): Promise<LayoutReviewContext> => {
  const filesToInclude = [
    "app/page.tsx",
    "app/layout.tsx",
    "components/comic/comic-generator.tsx",
    "components/ui/button.tsx",
    "app/globals.css",
  ]

  const files = await Promise.all(
    filesToInclude.map(async (p) => {
      const abs = path.join(/* turbopackIgnore: true */ repoRoot, p)
      const content = await readText(abs)
      return {
        path: p,
        excerpt: takeHeadTail(content, { headChars: 5200, tailChars: 1600 }),
      }
    })
  )

  return {
    repo: {
      framework: "Next.js App Router (Next 16) + React 19 + TypeScript",
      styling: "Tailwind CSS v4 + shadcn tokens + Base UI",
      ui: ["Generator form (script)", "Preview (reader/details)", "Generate images", "Download PDF"],
      constraints: [
        "Layout and UX changes only; do not change generation logic.",
        "Tailwind-only styling; do not add new CSS files.",
        "Prefer incremental improvements with clear acceptance criteria.",
      ],
    },
    files,
  }
}

