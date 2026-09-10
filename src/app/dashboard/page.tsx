import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import prisma from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import {
  getOrCreateStudentProfile,
  isAdminEmail,
  needsProfileSetup,
} from '@/utils/authUser'

type PageLanguage = 'th' | 'en'

type SystemMeta = {
  key: string
  bodySystem: string
  number: number
  nameTh: string
  nameEn: string
  subtitleTh: string
  subtitleEn: string
  testId: string
  exerciseId: string
}

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
}

const systems: SystemMeta[] = [
  {
    key: 'fever',
    bodySystem: 'อาการไข้และโรคติดเชื้อ',
    number: 1,
    nameTh: 'อาการไข้และโรคติดเชื้อ',
    nameEn: 'Fever & Infectious Illness',
    subtitleTh:
      'การซักประวัติ ประเมินสัญญาณชีพ และวินิจฉัยแยกโรคติดเชื้อ',
    subtitleEn: 'Fever history, vital signs, and differential diagnosis',
    testId: 'fever-test-001',
    exerciseId: 'fever-exercise-001',
  },
  {
    key: 'respiratory',
    bodySystem: 'ระบบทางเดินหายใจ',
    number: 2,
    nameTh: 'ระบบทางเดินหายใจ',
    nameEn: 'Respiratory System',
    subtitleTh: 'การประเมินอาการไอ หอบเหนื่อย และการวางแผนดูแล',
    subtitleEn: 'Cough, dyspnea, and respiratory care planning',
    testId: 'respiratory-test-001',
    exerciseId: 'respiratory-exercise-001',
  },
  {
    key: 'musculoskeletal',
    bodySystem: 'ระบบกระดูกและกล้ามเนื้อ',
    number: 3,
    nameTh: 'ระบบกระดูกและกล้ามเนื้อ',
    nameEn: 'Musculoskeletal System',
    subtitleTh: 'การประเมินอาการปวด การคัดกรองสัญญาณเตือน และการพยาบาล',
    subtitleEn: 'Pain assessment, red flags, and nursing care plan',
    testId: 'musculoskeletal-test-001',
    exerciseId: 'back-pain-scenario-001',
  },
  {
    key: 'urinary',
    bodySystem: 'ระบบทางเดินปัสสาวะ',
    number: 4,
    nameTh: 'ระบบทางเดินปัสสาวะ',
    nameEn: 'Urinary System',
    subtitleTh: 'การประเมินอาการทางปัสสาวะ การส่งตรวจ และคำแนะนำผู้ป่วย',
    subtitleEn: 'Urinary symptoms, investigation, and patient counseling',
    testId: 'urinary-test-001',
    exerciseId: 'urinary-exercise-001',
  },
]

function buildScenarioDescription(kind: 'test' | 'exercise', lang: PageLanguage) {
  if (kind === 'test') {
    return lang === 'th'
      ? 'กำลังเริ่มทำการทดสอบด้วยสถานการณ์จำลอง'
      : 'You are about to begin a simulation-based test.'
  }

  return lang === 'th'
    ? 'สถานการณ์สำหรับฝึกตอบทีละงาน พร้อมรับ feedback และคะแนน'
    : 'Practice station with step-by-step feedback and scoring.'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const lang = resolveLanguage(resolvedSearchParams.lang)
  const supabase = await createClient()
  const user = await getUserWithTimeout(supabase)

  if (!user) {
    redirect(`/login?lang=${lang}`)
  }

  const student = await getOrCreateStudentProfile(user)

  if (needsProfileSetup(student)) {
    redirect(`/profile/setup?lang=${lang}`)
  }

  const scenarios = await prisma.scenario.findMany({
    where: {
      id: {
        in: systems.flatMap((system) => [system.testId, system.exerciseId]),
      },
    },
    include: {
      steps: {
        select: {
          maxScore: true,
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  })

  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
  const cards = systems.flatMap((system) => {
    return [
      {
        scenarioId: system.testId,
        kind: 'test' as const,
      },
      {
        scenarioId: system.exerciseId,
        kind: 'exercise' as const,
      },
    ].flatMap(({ scenarioId, kind }) => {
      const scenario = scenarioById.get(scenarioId)

      if (!scenario) {
        return []
      }

      return [
        {
          id: scenario.id,
          kind,
          systemKey: system.key,
          systemNumber: system.number,
          titleTh: system.nameTh,
          titleEn: system.nameEn,
          subtitleTh: system.subtitleTh,
          subtitleEn: system.subtitleEn,
          descriptionTh: buildScenarioDescription(kind, 'th'),
          descriptionEn: buildScenarioDescription(kind, 'en'),
          isEnabled: scenario.isEnabled,
          totalPoints: scenario.steps.reduce(
            (total, step) => total + step.maxScore,
            0
          ),
        },
      ]
    })
  })

  return (
    <DashboardClient
      lang={lang}
      studentLabel={student.name || student.studentId}
      isAdmin={isAdminEmail(user.email)}
      scenarios={cards}
    />
  )
}
