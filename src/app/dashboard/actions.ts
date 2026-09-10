'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import { isAdminEmail } from '@/utils/authUser'
import prisma from '@/utils/prisma'

export async function toggleScenarioAvailability(formData: FormData) {
  const scenarioId = formData.get('scenarioId') as string | null
  const nextEnabled = formData.get('nextEnabled') === 'true'
  const lang = formData.get('lang') === 'en' ? 'en' : 'th'

  if (!scenarioId) {
    throw new Error('Scenario ID is missing')
  }

  const supabase = await createClient()
  const user = await getUserWithTimeout(supabase)

  if (!user) {
    redirect(`/login?lang=${lang}`)
  }

  if (!isAdminEmail(user.email)) {
    throw new Error('Admin permission required')
  }

  await prisma.scenario.update({
    where: {
      id: scenarioId,
    },
    data: {
      isEnabled: nextEnabled,
    },
  })

  revalidatePath('/dashboard')
}
