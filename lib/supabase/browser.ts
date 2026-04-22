import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseAnonKey, getSupabaseUrl } from "./env"

let cachedClient: SupabaseClient | null = null

export const getSupabaseBrowserClient = () => {
  if (cachedClient) return cachedClient
  cachedClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
  return cachedClient
}
