'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import { getOrCreateStudentProfile } from '@/utils/authUser'
import prisma from '@/utils/prisma'

export async function saveProfileName(formData: FormData) {
  const lang = formData.get('lang') === 'en' ? 'en' : 'th'
  const name = (formData.get('name') as string | null)?.trim()

  if (!name || name.length < 2) {
    redirect(`/profile/setup?error=invalid-name&lang=${lang}`)
  }

  const supabase = await createClient()
  const user = await getUserWithTimeout(supabase)

  if (!user) {
    redirect(`/login?lang=${lang}`)
  }

  const student = await getOrCreateStudentProfile(user)

  await prisma.student.update({
    where: {
      id: student.id,
    },
    data: {
      name: name.slice(0, 80),
      email: user.email?.trim().toLowerCase() ?? student.email,
    },
  })

  revalidatePath('/dashboard')
  redirect(`/dashboard?lang=${lang}`)
}
