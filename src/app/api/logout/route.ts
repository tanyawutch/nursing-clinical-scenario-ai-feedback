import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const lang = formData.get('lang') === 'en' ? 'en' : 'th'
  const supabase = await createClient()

  await supabase.auth.signOut()

  return NextResponse.redirect(new URL(`/login?lang=${lang}`, request.url), 303)
}
