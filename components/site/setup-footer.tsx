"use client"

import { Collapsible } from "@base-ui/react/collapsible"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export const SetupFooter = () => {
  return (
    <footer className="border-t pt-6 text-sm text-muted-foreground">
      <Collapsible.Root defaultOpen={false} className="max-w-2xl">
        <Collapsible.Trigger
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-left font-medium text-foreground outline-none",
            "hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
            "data-panel-open:bg-muted/30 data-panel-open:[&_svg]:rotate-180"
          )}
        >
          <span>Local setup & API keys</span>
          <ChevronDown className="size-4 shrink-0 transition-transform text-muted-foreground" aria-hidden="true" />
        </Collapsible.Trigger>
        <Collapsible.Panel className="pt-3 space-y-3">
          <p>
            Copy <code className="font-mono text-foreground">.env.example</code> to{" "}
            <code className="font-mono text-foreground">.env.local</code> and set{" "}
            <code className="font-mono text-foreground">OPENAI_API_KEY</code> for script + image generation. Without it,
            the script uses a local template and panel images use placeholders. Reference images (URLs or uploads) are
            sent to the vision model for continuity.
          </p>
          <p>
            <strong className="text-foreground">Reliable panel images:</strong> DALL·E 3 defaults to wide{" "}
            <code className="font-mono text-foreground">1792x1024</code> when{" "}
            <code className="font-mono text-foreground">OPENAI_IMAGE_SIZE</code> is unset. Use{" "}
            <code className="font-mono text-foreground">OPENAI_IMAGE_MAX_RETRIES</code>,{" "}
            <code className="font-mono text-foreground">NEXT_PUBLIC_OPENAI_IMAGE_STAGGER_MS</code>, and{" "}
            <code className="font-mono text-foreground">OPENAI_IMAGE_BATCH_STAGGER_MS</code> if later panels fail with
            rate limits.
          </p>
          <p>
            <strong className="text-foreground">Character Library:</strong> configure Supabase env vars and set{" "}
            <code className="font-mono text-foreground">NEXT_PUBLIC_SITE_URL</code> (e.g.{" "}
            <code className="font-mono text-foreground">http://localhost:3000</code>) so magic-link auth matches your
            Supabase redirect allow list. Full tables and steps are in the repo{" "}
            <code className="font-mono text-foreground">README.md</code> and{" "}
            <code className="font-mono text-foreground">supabase/README.md</code>.
          </p>
        </Collapsible.Panel>
      </Collapsible.Root>
    </footer>
  )
}
