'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const studentId = formData.get('studentId') as string
  const password = formData.get('password') as string
  const lang = formData.get('lang') === 'en' ? 'en' : 'th'

  // Check if inputs are empty
  if (!studentId || !password) {
    return redirect(`/login?error=Missing+Credentials&lang=${lang}`)
  }

  const supabase = await createClient()

  // Map Student ID to MFU Email format for Supabase Auth
  const email = `${studentId}@lamduan.mfu.ac.th`

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
