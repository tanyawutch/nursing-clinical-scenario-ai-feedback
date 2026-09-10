import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function getUserWithTimeout(
  supabase: SupabaseClient,
  timeoutMs = 5000
): Promise<User | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs)
  })

  try {
    return await Promise.race([
      supabase.auth
        .getUser()
        .then(({ data }) => data.user ?? null)
        .catch(() => null),
      timeout,
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export function hasSupabaseAuthCookie(cookies: { name: string }[]) {
  return cookies.some((cookie) => cookie.name.startsWith('sb-'))
}
