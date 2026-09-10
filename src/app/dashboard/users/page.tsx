import { redirect } from 'next/navigation'
import { isAdminEmail, normalizeEmail } from '@/utils/authUser'
import prisma from '@/utils/prisma'
import { createAdminClient } from '@/utils/supabase/admin'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import { createClient } from '@/utils/supabase/server'
import UsersClient, {
  type ManagedAttemptHistory,
  type ManagedUser,
} from './UsersClient'

type PageLanguage = 'th' | 'en'

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
}

function formatDuration(start: Date, end: Date, lang: PageLanguage) {
  const seconds = Math.max(Math.round((end.getTime() - start.getTime()) / 1000), 0)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return lang === 'th' ? `${remainingSeconds} วินาที` : `${remainingSeconds}s`
  }

  return lang === 'th'
    ? `${minutes} นาที ${remainingSeconds} วินาที`
    : `${minutes}m ${remainingSeconds}s`
}

function getStatusCopy(status: string | undefined, lang: PageLanguage) {
  const copy = {
    th: {
      created: 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว',
      updated: 'บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
      deleted: 'ลบผู้ใช้งานเรียบร้อยแล้ว',
      reset: 'รีเซ็ตจำนวนครั้งของผู้ใช้งานเรียบร้อยแล้ว',
    },
    en: {
      created: 'User created.',
      updated: 'User updated.',
      deleted: 'User deleted.',
      reset: 'User attempts reset.',
    },
  }[lang]

  return status && status in copy ? copy[status as keyof typeof copy] : ''
}

function getScoreText(history: {
  numericScore: number | null
  maxScore: number | null
  aiScore: string | null
}) {
  if (history.numericScore !== null && history.maxScore !== null) {
    return `${history.numericScore}/${history.maxScore}`
  }

  if (history.aiScore === 'correct') return 'ผ่าน'
  if (history.aiScore === 'partial') return 'ต้องปรับปรุง'
  if (history.aiScore === 'incorrect') return 'ยังไม่ผ่าน'
  return '-'
}

async function getStudentsWithHistory() {
  return prisma.student.findMany({
    include: {
      attempts: {
        include: {
          scenario: {
            select: {
              title: true,
              scenarioKind: true,
            },
          },
          attemptSteps: {
            include: {
              scenarioStep: {
                select: {
                  order: true,
                  title: true,
                },
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  })
}

function getAttemptHistory(
  student: Awaited<ReturnType<typeof getStudentsWithHistory>>[number],
  lang: PageLanguage
): ManagedAttemptHistory[] {
  return student.attempts
    .flatMap((attempt) => {
      const scenarioKind: 'test' | 'exercise' =
        attempt.scenario.scenarioKind === 'test' ? 'test' : 'exercise'
      const scenarioTitle =
        scenarioKind === 'test'
          ? lang === 'th'
            ? 'สถานการณ์ทดสอบ'
            : 'Test Scenario'
          : lang === 'th'
            ? 'สถานการณ์จำลอง'
            : 'Practice Scenario'

      if (attempt.attemptSteps.length === 0) {
        const answer = [attempt.primaryDiagnosis, attempt.interventions]
          .filter(Boolean)
          .join('\n\n')

        return [
          {
            id: attempt.id,
            scenarioTitle,
            scenarioKind,
            taskTitle: attempt.scenario.title,
            score: getScoreText({
              numericScore: null,
              maxScore: null,
              aiScore: attempt.aiScore,
            }),
            duration: '-',
            submittedAt: attempt.createdAt.toISOString(),
            answer,
            feedback: attempt.aiReasoning || '',
            guidance: attempt.aiMissingElements.join('\n'),
          },
        ]
      }

      return attempt.attemptSteps.map((step) => ({
        id: step.id,
        scenarioTitle,
        scenarioKind,
        taskTitle: `${step.scenarioStep.order}. ${step.scenarioStep.title}`,
        score: getScoreText(step),
        duration: formatDuration(step.createdAt, step.updatedAt, lang),
        submittedAt: step.updatedAt.toISOString(),
        answer: step.answer || '',
        feedback: step.aiReasoning || '',
        guidance: step.aiMissingElements.join('\n'),
      }))
    })
    .sort(
      (first, second) =>
        new Date(second.submittedAt).getTime() -
        new Date(first.submittedAt).getTime()
    )
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; status?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const lang = resolveLanguage(resolvedSearchParams.lang)
  const supabase = await createClient()
  const currentUser = await getUserWithTimeout(supabase)

  if (!currentUser) {
    redirect(`/login?lang=${lang}`)
  }

  if (!isAdminEmail(currentUser.email)) {
    redirect(`/dashboard?lang=${lang}`)
  }

  const [students, authUsersResult] = await Promise.all([
    getStudentsWithHistory(),
    createAdminClient().auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),
  ])

  if (authUsersResult.error) {
    throw new Error(authUsersResult.error.message)
  }

  const usersByEmail = new Map(
    authUsersResult.data.users.map((user) => [
      normalizeEmail(user.email),
      user,
    ])
  )
  const studentsByEmail = new Map(
    students
      .filter((student) => student.email)
      .map((student) => [normalizeEmail(student.email), student])
  )
  const mergedEmails = new Set<string>([
    ...Array.from(usersByEmail.keys()),
    ...Array.from(studentsByEmail.keys()),
  ])

  const managedUsers: ManagedUser[] = Array.from(mergedEmails)
    .map((email) => {
      const authUser = usersByEmail.get(email)
      const student = studentsByEmail.get(email)
      const testAttemptsCount =
        student?.attempts.filter(
          (attempt) => attempt.scenario.scenarioKind === 'test'
        ).length ?? 0
      const exerciseAttemptsCount =
        student?.attempts.filter(
          (attempt) => attempt.scenario.scenarioKind !== 'test'
        ).length ?? 0
      const metadataName =
        typeof authUser?.user_metadata?.display_name === 'string'
          ? authUser.user_metadata.display_name
          : ''

      return {
        key: email || authUser?.id || student?.id || 'user',
        authUserId: authUser?.id ?? '',
        studentDbId: student?.id ?? '',
        email,
        name: student?.name || metadataName || '',
        studentId: student?.studentId || email.split('@')[0] || '',
        attemptsCount: testAttemptsCount + exerciseAttemptsCount,
        testAttemptsCount,
        exerciseAttemptsCount,
        authCreatedAt: authUser?.created_at ?? '',
        lastSignInAt: authUser?.last_sign_in_at ?? '',
        hasAuthAccount: Boolean(authUser),
        history: student ? getAttemptHistory(student, lang) : [],
      }
    })
    .sort((first, second) => first.email.localeCompare(second.email))

  return (
    <UsersClient
      lang={lang}
      statusCopy={getStatusCopy(resolvedSearchParams.status, lang)}
      managedUsers={managedUsers}
    />
  )
}
