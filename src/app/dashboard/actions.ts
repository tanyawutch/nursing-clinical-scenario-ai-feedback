'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import { getOrCreateStudentProfile, isAdminEmail } from '@/utils/authUser'
import prisma from '@/utils/prisma'

const TEST_ATTEMPT_LIMIT = 1
const EXERCISE_ATTEMPT_LIMIT = 2
const TEST_TIME_LIMIT_SECONDS = 30 * 60

function getScenarioAttemptLimit(scenario: { id: string; scenarioKind: string }) {
  if (scenario.scenarioKind === 'test' || scenario.id.includes('test')) {
    return TEST_ATTEMPT_LIMIT
  }

  return EXERCISE_ATTEMPT_LIMIT
}

function getScenarioTimeLimitSeconds(scenario: {
  id: string
  scenarioKind: string
}) {
  if (scenario.scenarioKind === 'test' || scenario.id.includes('test')) {
    return TEST_TIME_LIMIT_SECONDS
  }

  return null
}

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

export async function startScenarioAttempt(formData: FormData) {
  const scenarioId = formData.get('scenarioId') as string | null
  const lang = formData.get('lang') === 'en' ? 'en' : 'th'

  if (!scenarioId) {
    throw new Error('Scenario ID is missing')
  }

  const supabase = await createClient()
  const user = await getUserWithTimeout(supabase)

  if (!user) {
    redirect(`/login?lang=${lang}`)
  }

  const student = await getOrCreateStudentProfile(user)
  const scenario = await prisma.scenario.findUnique({
    where: {
      id: scenarioId,
    },
    include: {
      steps: {
        orderBy: {
          order: 'asc',
        },
        take: 1,
      },
    },
  })

  if (!scenario) {
    throw new Error('Scenario not found')
  }

  if (!scenario.isEnabled && !isAdminEmail(user.email)) {
    throw new Error('This scenario is currently closed')
  }

  const existingAttempt = await prisma.attempt.findFirst({
    where: {
      studentId: student.id,
      scenarioId: scenario.id,
      isCompleted: false,
    },
    orderBy: {
      startedAt: 'desc',
    },
  })

  if (existingAttempt) {
    redirect(
      `/dashboard/scenario/${scenario.id}?attemptId=${existingAttempt.id}&lang=${lang}`
    )
  }

  const completedAttempts = await prisma.attempt.count({
    where: {
      studentId: student.id,
      scenarioId: scenario.id,
      isCompleted: true,
    },
  })
  const attemptLimit = getScenarioAttemptLimit(scenario)

  if (completedAttempts >= attemptLimit) {
    redirect(`/dashboard?lang=${lang}`)
  }

  const attempt = await prisma.attempt.create({
    data: {
      studentId: student.id,
      scenarioId: scenario.id,
      primaryDiagnosis: null,
      interventions: null,
      isCompleted: false,
      aiStatus: 'pending',
      aiReasoning: 'Step-by-step practice in progress.',
      startedAt: new Date(),
      timeLimitSeconds: getScenarioTimeLimitSeconds(scenario),
    },
  })
  const firstStep = scenario.steps[0]
  const stepParam = firstStep ? `&stepId=${firstStep.id}` : ''

  redirect(
    `/dashboard/scenario/${scenario.id}?attemptId=${attempt.id}${stepParam}&lang=${lang}`
  )
}
