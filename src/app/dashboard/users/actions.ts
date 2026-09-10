'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isAdminEmail, normalizeEmail } from '@/utils/authUser'
import prisma from '@/utils/prisma'
import { createAdminClient } from '@/utils/supabase/admin'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import { createClient } from '@/utils/supabase/server'

type PageLanguage = 'th' | 'en'

function getLang(formData: FormData): PageLanguage {
  return formData.get('lang') === 'en' ? 'en' : 'th'
}

function getRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) {
    throw new Error(`${key} is required`)
  }

  return value
}

async function requireAdmin(lang: PageLanguage) {
  const supabase = await createClient()
  const user = await getUserWithTimeout(supabase)

  if (!user) {
    redirect(`/login?lang=${lang}`)
  }

  if (!isAdminEmail(user.email)) {
    redirect(`/dashboard?lang=${lang}`)
  }

  return user
}

function getStudentId(email: string, studentId: string) {
  return studentId.trim() || email.split('@')[0] || email
}

function getRedirectPath(lang: PageLanguage, status: string) {
  return `/dashboard/users?lang=${lang}&status=${status}`
}

export async function createManagedUser(formData: FormData) {
  const lang = getLang(formData)
  await requireAdmin(lang)

  const email = normalizeEmail(getRequiredText(formData, 'email'))
  const name = getRequiredText(formData, 'name')
  const password = getRequiredText(formData, 'password')
  const studentId = getStudentId(email, String(formData.get('studentId') ?? ''))

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: name,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  await prisma.student.upsert({
    where: {
      studentId,
    },
    update: {
      name,
      email,
    },
    create: {
      studentId,
      name,
      email,
    },
  })

  revalidatePath('/dashboard/users')
  redirect(getRedirectPath(lang, 'created'))
}

export async function updateManagedUser(formData: FormData) {
  const lang = getLang(formData)
  const currentUser = await requireAdmin(lang)

  const authUserId = String(formData.get('authUserId') ?? '').trim()
  const studentDbId = String(formData.get('studentDbId') ?? '').trim()
  const originalEmail = normalizeEmail(String(formData.get('originalEmail') ?? ''))
  const email = normalizeEmail(getRequiredText(formData, 'email'))
  const name = getRequiredText(formData, 'name')
  const studentId = getStudentId(email, String(formData.get('studentId') ?? ''))
  const password = String(formData.get('password') ?? '').trim()

  const isEditingSelf =
    (authUserId && authUserId === currentUser.id) ||
    (originalEmail && normalizeEmail(currentUser.email) === originalEmail)

  const adminSupabase = createAdminClient()

  if (authUserId) {
    const updates: {
      email?: string
      password?: string
      user_metadata: {
        display_name: string
      }
    } = {
      email,
      user_metadata: {
        display_name: name,
      },
    }

    if (password) {
      updates.password = password
    }

    const { error } = await adminSupabase.auth.admin.updateUserById(
      authUserId,
      updates
    )

    if (error) {
      throw new Error(error.message)
    }
  }

  if (studentDbId) {
    await prisma.student.update({
      where: {
        id: studentDbId,
      },
      data: {
        studentId,
        name,
        email,
      },
    })
  } else {
    await prisma.student.upsert({
      where: {
        studentId,
      },
      update: {
        name,
        email,
      },
      create: {
        studentId,
        name,
        email,
      },
    })
  }

  revalidatePath('/dashboard/users')

  if (isEditingSelf && email !== normalizeEmail(currentUser.email)) {
    redirect(`/login?lang=${lang}`)
  }

  redirect(getRedirectPath(lang, 'updated'))
}

export async function deleteManagedUser(formData: FormData) {
  const lang = getLang(formData)
  const currentUser = await requireAdmin(lang)

  const authUserId = String(formData.get('authUserId') ?? '').trim()
  const studentDbId = String(formData.get('studentDbId') ?? '').trim()
  const email = normalizeEmail(String(formData.get('email') ?? ''))

  const isDeletingSelf =
    (authUserId && authUserId === currentUser.id) ||
    (email && normalizeEmail(currentUser.email) === email)

  if (isDeletingSelf) {
    throw new Error('You cannot delete your own admin account.')
  }

  if (studentDbId) {
    const attempts = await prisma.attempt.findMany({
      where: {
        studentId: studentDbId,
      },
      select: {
        id: true,
      },
    })

    const attemptIds = attempts.map((attempt) => attempt.id)

    if (attemptIds.length > 0) {
      await prisma.attemptStep.deleteMany({
        where: {
          attemptId: {
            in: attemptIds,
          },
        },
      })

      await prisma.attempt.deleteMany({
        where: {
          id: {
            in: attemptIds,
          },
        },
      })
    }

    await prisma.student.delete({
      where: {
        id: studentDbId,
      },
    })
  }

  if (authUserId) {
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.auth.admin.deleteUser(authUserId)

    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePath('/dashboard/users')
  redirect(getRedirectPath(lang, 'deleted'))
}

export async function resetManagedUserAttempts(formData: FormData) {
  const lang = getLang(formData)
  await requireAdmin(lang)

  const studentDbId = String(formData.get('studentDbId') ?? '').trim()
  const scope = String(formData.get('scope') ?? 'all')

  if (!studentDbId) {
    throw new Error('Student profile is missing')
  }

  const attempts = await prisma.attempt.findMany({
    where: {
      studentId: studentDbId,
      ...(scope === 'test' || scope === 'exercise'
        ? {
            scenario: {
              scenarioKind: scope,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  const attemptIds = attempts.map((attempt) => attempt.id)

  if (attemptIds.length > 0) {
    await prisma.$transaction([
      prisma.attemptStep.deleteMany({
        where: {
          attemptId: {
            in: attemptIds,
          },
        },
      }),
      prisma.attempt.deleteMany({
        where: {
          id: {
            in: attemptIds,
          },
        },
      }),
    ])
  }

  revalidatePath('/dashboard/users')
  revalidatePath('/dashboard/history')
  redirect(getRedirectPath(lang, 'reset'))
}
