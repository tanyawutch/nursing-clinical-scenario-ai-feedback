'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getOrCreateStudentProfile } from '@/utils/authUser'
import prisma from '@/utils/prisma'

export type UpdateDisplayNameState = {
  ok: boolean
  error: string
}

export const initialUpdateDisplayNameState: UpdateDisplayNameState = {
  ok: false,
  error: '',
}

export async function updateDisplayName(
  _previousState: UpdateDisplayNameState,
  formData: FormData
): Promise<UpdateDisplayNameState> {
  const name = String(formData.get('name') ?? '').trim()

  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: 'กรุณากรอกชื่อระหว่าง 2-80 ตัวอักษร' }
  }

  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user

  if (!user) {
    return { ok: false, error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }
  }

  const student = await getOrCreateStudentProfile(user)

  await prisma.student.update({
    where: { id: student.id },
    data: { name },
  })

  await supabase.auth.updateUser({
    data: { display_name: name },
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/history')
  revalidatePath('/dashboard/scenario/[id]', 'page')
  revalidatePath('/dashboard/users')

  return { ok: true, error: '' }
}
