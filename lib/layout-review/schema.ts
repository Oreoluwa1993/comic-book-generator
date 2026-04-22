export type LayoutReviewIssueSeverity = "low" | "med" | "high"

export type LayoutReviewUxOutput = {
  flow: string[]
  issues: Array<{
    id: string
    severity: LayoutReviewIssueSeverity
    target: "Header" | "Generator" | "Preview" | "Toolbar" | "Panels" | "Mobile"
    evidence: string
    recommendation: string
  }>
  layoutSpec: {
    pageHeader: string
    generator: string
    preview: string
    toolbar: string
    mobile: string
  }
  a11y: Array<{
    title: string
    risk: string
    fix: string
  }>
  acceptanceCriteria: string[]
}

export type LayoutReviewDevOutput = {
  approach: string
  changes: Array<{
    priority: number
    summary: string
    targetFiles: string[]
    rationale: string
    implementationNotes: string[]
    acceptanceCriteria: string[]
    risks: string[]
  }>
  a11yFixes: Array<{
    summary: string
    targetFiles: string[]
    implementationNotes: string[]
  }>
  verification: string[]
}

export type LayoutReviewOkResult = {
  ok: true
  createdAt: string
  ux: LayoutReviewUxOutput
  dev: LayoutReviewDevOutput
}

export type LayoutReviewErrorResult = {
  ok: false
  error: "MISSING_OPENAI_API_KEY" | "DISABLED" | "INVALID_OUTPUT_FORMAT" | "PARSE_FAILED" | "CALL_FAILED"
  rawText?: string
}

export type LayoutReviewResult = LayoutReviewOkResult | LayoutReviewErrorResult

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const tryParseJsonObject = (raw: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(raw) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

