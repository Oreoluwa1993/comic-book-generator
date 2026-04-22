import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "./env"

export const getSupabaseServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })
}

export const getSupabaseAdminClient = (): SupabaseClient => {
  return createServerClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // Admin client: no-op cookie writes
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
