import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import LanguageToggle from '@/app/components/LanguageToggle'
import LogoutButton from '@/app/components/LogoutButton'
import AttemptTimer from './AttemptTimer'
import ScenarioStepPractice from './ScenarioStepPractice'
import prisma from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import {
  getOrCreateStudentProfile,
  isAdminEmail,
  needsProfileSetup,
} from '@/utils/authUser'

type PageLanguage = 'th' | 'en'

const TEST_TIME_LIMIT_SECONDS = 30 * 60

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
}

function getScenarioKindFromId(scenarioId: string) {
  return scenarioId.includes('test') ? 'test' : 'exercise'
}

function getScenarioDisplayTitle(scenarioId: string, lang: PageLanguage) {
  const kind = getScenarioKindFromId(scenarioId)

  if (kind === 'test') {
    return lang === 'th' ? 'สถานการณ์ทดสอบ' : 'Test Scenario'
  }

  return lang === 'th' ? 'สถานการณ์จำลอง' : 'Practice Scenario'
}

function getMaxStepAttempts(scenario: { id: string; scenarioKind: string }) {
  if (scenario.scenarioKind === 'test' || scenario.id.includes('test')) {
    return 1
  }

  return 2
}

function isTestScenario(scenario: { id: string; scenarioKind: string }) {
  return scenario.scenarioKind === 'test' || scenario.id.includes('test')
}

function formatDuration(totalSeconds: number | null, lang: PageLanguage) {
  if (totalSeconds === null) return '-'

  const seconds = Math.max(totalSeconds, 0)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return lang === 'th' ? `${remainingSeconds} วินาที` : `${remainingSeconds}s`
  }

  return lang === 'th'
    ? `${minutes} นาที ${remainingSeconds} วินาที`
    : `${minutes}m ${remainingSeconds}s`
}

function formatPatientDescription(description: string) {
  return description
    .replace(/\s*ข้อมูลทั่วไป \(General information\):\s*/g, '\n\nข้อมูลทั่วไป (General information): ')
    .replace(/\s*ประวัติการเจ็บป่วยในอดีต \(Past History\)\s*/g, '\n\nประวัติการเจ็บป่วยในอดีต (Past History)\n')
    .replace(/\s*พฤติกรรมสุขภาพ \(Health behavior\)\s*/g, '\n\nพฤติกรรมสุขภาพ (Health behavior)\n')
    .replace(/\s*อาการสำคัญที่นำผู้ป่วยมาโรงพยาบาล/g, '\n\nอาการสำคัญที่นำผู้ป่วยมาโรงพยาบาล')
    .trim()
}

function extractGeneralAppearance(description: string) {
  const normalizedDescription = description.replace(/\s+/g, ' ').trim()
  const match = normalizedDescription.match(
    /(ลักษณะทั่วไปของผู้ป่วย:\s*.*?)(?=\s*ข้อมูลทั่วไป \(General information\):|\s*ประวัติการเจ็บป่วย|\s*พฤติกรรมสุขภาพ|\s*อาการสำคัญที่นำผู้ป่วยมาโรงพยาบาล|$)/
  )

  return match?.[1]?.trim() ?? ''
}

function PatientDescription({ description }: { description: string }) {
  const headingPattern =
    /^(ข้อมูลทั่วไป \(General information\):|ประวัติการเจ็บป่วยในอดีต \(Past History\)|พฤติกรรมสุขภาพ \(Health behavior\)|อาการสำคัญที่นำผู้ป่วยมาโรงพยาบาล.*?:)(.*)$/
  const blocks = description
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <div className="mt-3 space-y-5 text-base leading-8 text-slate-800">
      {blocks.map((block) => {
        const match = block.match(headingPattern)

        if (!match) {
          return (
            <p key={block} className="whitespace-pre-line">
              {block}
            </p>
          )
        }

        return (
          <p key={block} className="whitespace-pre-line">
            <strong className="font-bold text-slate-950">{match[1]}</strong>
            {match[2] ? ` ${match[2].trim()}` : ''}
          </p>
        )
      })}
    </div>
  )
}

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ attemptId?: string; stepId?: string; lang?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const scenarioId = resolvedParams.id
  const lang = resolveLanguage(resolvedSearchParams.lang)

  const supabase = await createClient()
  const user = await getUserWithTimeout(supabase)

  if (!user) {
    redirect('/login')
  }

  const student = await getOrCreateStudentProfile(user)

  if (needsProfileSetup(student)) {
    redirect(`/profile/setup?lang=${lang}`)
  }

  const scenario = await prisma.scenario.findUnique({
    where: {
      id: scenarioId,
    },
    include: {
      steps: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  })

  if (!scenario) {
    notFound()
  }

  if (!scenario.isEnabled && !isAdminEmail(user.email)) {
    redirect(`/dashboard?lang=${lang}`)
  }

  const firstStep = scenario.steps[0] ?? null
  const targetStep =
    scenario.steps.find((step) => step.id === resolvedSearchParams.stepId) ??
    firstStep

  const activeAttempt = await prisma.attempt.findFirst({
    where: resolvedSearchParams.attemptId
      ? {
          id: resolvedSearchParams.attemptId,
          scenarioId: scenario.id,
          student: {
            email: user.email,
          },
        }
      : {
          scenarioId: scenario.id,
          isCompleted: false,
          student: {
            email: user.email,
          },
        },
    orderBy: {
      startedAt: 'desc',
    },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      durationSeconds: true,
      timeLimitSeconds: true,
      completedWithinTimeLimit: true,
      attemptSteps: {
        select: {
          scenarioStepId: true,
          answer: true,
          aiScore: true,
          aiReasoning: true,
          aiMissingElements: true,
          aiStatus: true,
          numericScore: true,
          maxScore: true,
          matchedElements: true,
          evaluationDetails: true,
          attemptCount: true,
          isLocked: true,
          modelAnswerRevealed: true,
        },
      },
    },
  })

  const latestAttemptStep = targetStep
    ? (activeAttempt?.attemptSteps.find(
        (step) => step.scenarioStepId === targetStep.id
      ) ?? null)
    : null
  const allStepsCompleted =
    scenario.steps.length > 0 &&
    scenario.steps.every((step) => {
      const attemptStep = activeAttempt?.attemptSteps.find(
        (item) => item.scenarioStepId === step.id
      )

      return Boolean(attemptStep?.isLocked && attemptStep.modelAnswerRevealed)
    })

  const copy = {
    th: {
      back: 'กลับหน้าแดชบอร์ด',
      assessment: 'การประเมินทางคลินิก',
      scenarioLabel: 'สถานการณ์ผู้ป่วย',
      bodySystemFallback: 'กรณีศึกษา',
      patientProfile: 'ข้อมูลผู้ป่วย',
      workflowLabel: 'ลำดับงานตามเอกสาร',
      workflowTitle: 'ทำแบบฝึกตาม rubric ทั้ง 5 งาน',
      workflowBody:
        'เลือกงานที่ต้องการทำ ระบบจะแสดงฟอร์มเฉพาะหัวข้อนั้นและให้ feedback พร้อมคะแนน',
      points: 'คะแนน',
      pass: 'ผ่าน',
      start: 'ทำข้อนี้',
      active: 'กำลังทำ',
      caseSummary: 'สรุปกรณีศึกษา',
      timeResult: 'ผลเวลา',
      timePassed: 'ผ่านเงื่อนไขเวลา',
      timeFailed: 'เกินเวลา 30 นาที จึงยังไม่ผ่านเงื่อนไขเวลา',
      duration: 'เวลาที่ใช้',
    },
    en: {
      back: 'Back to Dashboard',
      assessment: 'Clinical Assessment',
      scenarioLabel: 'Clinical Scenario',
      bodySystemFallback: 'Clinical Case',
      patientProfile: 'Patient Profile',
      workflowLabel: 'Document workflow',
      workflowTitle: 'Complete all 5 rubric tasks',
      workflowBody:
        'Choose a task. The system shows a structured form and returns score-based feedback.',
      points: 'points',
      pass: 'pass',
      start: 'Start task',
      active: 'Current task',
      caseSummary: 'Case summary',
      timeResult: 'Time result',
      timePassed: 'Within time limit',
      timeFailed: 'Over 30 minutes, so the time requirement is not passed',
      duration: 'Duration',
    },
  }[lang]
  const scenarioDisplayTitle = getScenarioDisplayTitle(scenario.id, lang)
  const patientDescription = formatPatientDescription(scenario.description)
  const patientGeneralAppearance = extractGeneralAppearance(scenario.description)
  const maxStepAttempts = getMaxStepAttempts(scenario)
  const shouldShowTestTimer = isTestScenario(scenario) && Boolean(activeAttempt)
  const nextStepId = targetStep
    ? scenario.steps.find((step) => step.order === targetStep.order + 1)?.id ?? null
    : null
  const totalMaxScore = scenario.steps.reduce(
    (total, step) => total + step.maxScore,
    0
  )
  const totalEarnedScore = scenario.steps.reduce((total, step) => {
    const attemptStep = activeAttempt?.attemptSteps.find(
      (item) => item.scenarioStepId === step.id
    )

    return total + (attemptStep?.numericScore ?? 0)
  }, 0)

  return (
    <div className="min-h-screen bg-slate-100 pb-12 font-sans text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href={`/dashboard?lang=${lang}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5821F] transition-colors hover:text-[#D96F14]"
          >
            <span aria-hidden="true">←</span>
            {copy.back}
          </Link>

            <div className="flex items-center gap-3">
              {shouldShowTestTimer ? (
                <AttemptTimer
                  lang={lang}
                  startedAt={activeAttempt?.startedAt.toISOString() ?? null}
                  completedAt={activeAttempt?.completedAt?.toISOString() ?? null}
                  timeLimitSeconds={
                    activeAttempt?.timeLimitSeconds ?? TEST_TIME_LIMIT_SECONDS
                  }
                />
              ) : null}
              <div className="hidden items-center gap-3 sm:flex">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F5821F]" />
              <span className="text-sm font-semibold text-slate-800">
                {copy.assessment}
              </span>
            </div>
            <LanguageToggle
              lang={lang}
              pathname={`/dashboard/scenario/${scenario.id}`}
              searchParams={{
                attemptId: resolvedSearchParams.attemptId,
                stepId: targetStep?.id,
              }}
            />
            <LogoutButton lang={lang} />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 w-full max-w-[1440px] space-y-6 px-5 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#F5821F] px-7 py-7 text-white sm:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-white">
                  {copy.scenarioLabel}
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {scenarioDisplayTitle}
                </h1>
              </div>

              <span className="inline-flex w-fit items-center rounded-full border border-white/50 bg-white/20 px-4 py-1.5 text-sm font-semibold text-white">
                {scenario.bodySystem || copy.bodySystemFallback}
              </span>
            </div>
          </div>

        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#F5821F]">
                {copy.workflowLabel}
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                {copy.workflowTitle}
              </h2>

              <p className="mt-3 text-base leading-8 text-slate-800">
                {copy.workflowBody}
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900">
              {scenario.steps.length} steps
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            {scenario.steps.map((step) => {
              const isActive = targetStep?.id === step.id

              return (
                <article
                  key={step.id}
                  className={`flex min-h-[220px] flex-col rounded-2xl border p-5 shadow-sm transition ${
                    isActive
                      ? 'border-[#F5821F] bg-[#FFF4E8] ring-2 ring-[#F5821F]/10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-base font-bold text-blue-900">
                      {step.order}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                      {step.maxScore} {copy.points}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold leading-6 text-slate-950">
                    {step.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">
                    {step.prompt}
                  </p>

                  <p className="mt-3 text-xs font-bold text-slate-600">
                    {copy.pass}: {step.passScore}/{step.maxScore}
                  </p>

                  <Link
                    href={`/dashboard/scenario/${scenario.id}?stepId=${step.id}${
                      activeAttempt ? `&attemptId=${activeAttempt.id}` : ''
                    }&lang=${lang}`}
                    className={`mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      isActive
                        ? 'bg-[#F5821F] text-white'
                        : 'border border-slate-300 bg-white text-slate-800 hover:border-[#F5821F]/40 hover:text-[#F5821F]'
                    }`}
                  >
                    {isActive ? copy.active : copy.start}
                  </Link>
                </article>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5821F] text-base font-bold text-white">
              1
            </div>

            <div>
              <h2 className="text-base font-bold uppercase tracking-[0.08em] text-slate-950">
                {copy.patientProfile}
              </h2>

              <PatientDescription description={patientDescription} />
            </div>
          </div>
        </section>

        <ScenarioStepPractice
          key={`${targetStep?.id ?? 'no-step'}-${
            latestAttemptStep?.attemptCount ?? 0
          }-${latestAttemptStep?.isLocked ?? false}-${lang}`}
          lang={lang}
          scenarioId={scenario.id}
          patientGeneralAppearance={patientGeneralAppearance}
          maxStepAttempts={maxStepAttempts}
          step={
            targetStep
              ? {
                  id: targetStep.id,
                  order: targetStep.order,
                  title: targetStep.title,
                  prompt: targetStep.prompt,
                  modelAnswer: targetStep.modelAnswer,
                  maxScore: targetStep.maxScore,
                  passScore: targetStep.passScore,
                  formSchema: targetStep.formSchema,
                }
              : null
          }
          latestAttemptStep={latestAttemptStep}
          attemptId={activeAttempt?.id}
          nextStepId={nextStepId}
          isScenarioComplete={allStepsCompleted}
        />

        {allStepsCompleted ? (
          <section id="final-summary" className="space-y-6">
            <div className="rounded-2xl border border-[#F5821F]/30 bg-[#FFF8F1] p-6 shadow-sm sm:p-8 lg:p-10">
              <h2 className="text-xl font-bold text-slate-950">
                {lang === 'th' ? 'สรุปผลการทำสถานการณ์' : 'Scenario result summary'}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#F5821F]/30 bg-white px-4 py-2 text-base font-bold text-[#C45D0C]">
                  {lang === 'th' ? 'คะแนนรวม' : 'Total score'}: {totalEarnedScore}/{totalMaxScore}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  {lang === 'th' ? 'ทำครบ 5 ข้อแล้ว' : 'All 5 tasks completed'}
                </span>
              </div>
              {isTestScenario(scenario) &&
              activeAttempt?.durationSeconds !== null &&
              activeAttempt?.durationSeconds !== undefined ? (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
                    activeAttempt.completedWithinTimeLimit
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {copy.timeResult}: {copy.duration}{' '}
                  {formatDuration(activeAttempt.durationSeconds, lang)} ·{' '}
                  {activeAttempt.completedWithinTimeLimit
                    ? copy.timePassed
                    : copy.timeFailed}
                </div>
              ) : null}
            </div>

            {scenario.modelAnswer ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                <h2 className="text-xl font-bold text-slate-950">
                  {copy.caseSummary}
                </h2>
                <p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-800">
                  {scenario.modelAnswer}
                </p>
              </section>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  )
}

