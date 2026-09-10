import type { User } from '@supabase/supabase-js'
import prisma from '@/utils/prisma'

const DEFAULT_ADMIN_EMAIL = 'pmcsmartbuddy@gmail.com'

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? ''
}

export function getUserIdentifier(user: User) {
  const email = normalizeEmail(user.email)
  return email.split('@')[0] || user.id
}

export function isAdminEmail(email?: string | null) {
  const normalizedEmail = normalizeEmail(email)
  const adminEmails = (process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAIL)
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter(Boolean)

  return adminEmails.includes(normalizedEmail)
}

export function needsProfileSetup(student: {
  studentId: string
  name: string | null
}) {
  const name = student.name?.trim()

  return !name || name === student.studentId
}

export async function getOrCreateStudentProfile(user: User) {
  const email = normalizeEmail(user.email)
  const studentId = getUserIdentifier(user)

  const studentByEmail = email
    ? await prisma.student.findUnique({
        where: {
          email,
        },
      })
    : null

  if (studentByEmail) {
    return studentByEmail
  }

  return await prisma.student.upsert({
    where: {
      studentId,
    },
    update: {
      email: email || null,
    },
    create: {
      studentId,
      name: '',
      email: email || null,
    },
  })
}
