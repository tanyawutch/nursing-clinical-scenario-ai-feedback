'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

function getBasePath() {
  return process.env.VERCEL ? '' : '/ncs-ai-feedback'
}

export async function login(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const lang = formData.get('lang') === 'en' ? 'en' : 'th'

  // Check if inputs are empty
  if (!email || !password) {
    return redirect(`/login?error=Missing+Credentials&lang=${lang}`)
  }

  const supabase = await createClient()

  // Standard Sign In with the user-provided password
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // If login fails (wrong ID or password)
  if (error) {
    return redirect(`/login?error=Invalid+Credentials&lang=${lang}`)
  }

  // If successful, revalidate and go to dashboard
  revalidatePath('/', 'layout')
  redirect(`/dashboard?lang=${lang}`)
}

export async function loginWithGoogle(formData: FormData) {
  const lang = formData.get('lang') === 'en' ? 'en' : 'th'
  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? ''
  const redirectTo = `${origin}${getBasePath()}/auth/callback?next=/dashboard&lang=${lang}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })

  if (error || !data.url) {
    redirect(`/login?error=Google+Login+Failed&lang=${lang}`)
  }

  redirect(data.url)
}
