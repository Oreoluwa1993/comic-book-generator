export const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.")
  return url
}

export const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  return key
}

export const getSupabaseServiceRoleKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.")
  return key
}
