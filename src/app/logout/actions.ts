'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function resolveLanguage(value: FormDataEntryValue | null) {
  return value === 'en' ? 'en' : 'th'
}

export async function logout(formData: FormData) {
  const lang = resolveLanguage(formData.get('lang'))
  const supabase = await createClient()

  await supabase.auth.signOut()

  redirect(`/login?lang=${lang}`)
}
