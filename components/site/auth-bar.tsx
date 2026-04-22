"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AuthState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; email: string | null }

export const AuthBar = ({ className }: { className?: string }) => {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<AuthState>({ status: "loading" })
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error) {
        setState({ status: "signed_out" })
        return
      }
      if (data.user) {
        setState({ status: "signed_in", email: data.user.email ?? null })
        return
      }
      setState({ status: "signed_out" })
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load()
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const handleSendMagicLink = () => {
    const cleaned = email.trim()
    if (!cleaned) {
      setMessage("Enter your email to sign in.")
      return
    }

    setMessage(null)
    startTransition(async () => {
      const siteBase = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? ""
      const pathWithQuery = `${window.location.pathname}${window.location.search}`
      const emailRedirectTo = siteBase.length > 0 ? `${siteBase}${pathWithQuery}` : window.location.href

      const { error } = await supabase.auth.signInWithOtp({
        email: cleaned,
        options: { emailRedirectTo },
      })
      if (error) {
        setMessage(error.message)
        return
      }
      setMessage("Check your email for a sign-in link.")
    })
  }

  const handleSignOut = () => {
    setMessage(null)
    startTransition(async () => {
      await supabase.auth.signOut()
    })
  }

  if (state.status === "loading") {
    return <div className={cn("text-xs text-muted-foreground", className)}>Loading…</div>
  }

  if (state.status === "signed_in") {
    return (
      <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
        <p className="text-xs text-muted-foreground">
          Signed in{state.email ? <> as <span className="font-medium text-foreground">{state.email}</span></> : null}
        </p>
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleSignOut} disabled={isPending}>
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end", className)}>
      <div className="flex items-center gap-2">
        <label htmlFor="authEmail" className="sr-only">
          Email
        </label>
        <input
          id="authEmail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={cn(
            "h-8 w-full min-w-56 rounded-lg border bg-background px-3 text-sm outline-none",
            "focus-visible:ring-3 focus-visible:ring-ring/50"
          )}
          aria-label="Email address"
        />
      </div>
      <Button type="button" size="sm" className="h-8" onClick={handleSendMagicLink} disabled={isPending}>
        Sign in (magic link)
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}

