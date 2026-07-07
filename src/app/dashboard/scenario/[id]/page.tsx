import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import LanguageToggle from '@/app/components/LanguageToggle'
import LogoutButton from '@/app/components/LogoutButton'
import ScenarioStepPractice from './ScenarioStepPractice'
import prisma from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'

type PageLanguage = 'th' | 'en'

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
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

  const firstStep = scenario.steps[0] ?? null
  const targetStep =
    scenario.steps.find((step) => step.id === resolvedSearchParams.stepId) ??
    firstStep

  const latestAttemptStep =
    targetStep && resolvedSearchParams.attemptId
      ? await prisma.attemptStep.findFirst({
          where: {
            attemptId: resolvedSearchParams.attemptId,
            scenarioStepId: targetStep.id,
            attempt: {
              scenarioId: scenario.id,
              isCompleted: false,
              student: {
                email: user.email,
              },
            },
          },
          select: {
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
        })
      : targetStep
        ? await prisma.attemptStep.findFirst({
            where: {
              scenarioStepId: targetStep.id,
              attempt: {
                scenarioId: scenario.id,
                isCompleted: false,
                student: {
                  email: user.email,
                },
              },
            },
            orderBy: {
              attempt: {
                createdAt: 'desc',
              },
            },
            select: {
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
          })
        : null

  const copy = {
    th: {
      back: 'กลับหน้าแดชบอร์ด',
      assessment: 'การประเมินทางคลินิก',
      scenarioLabel: 'สถานการณ์ผู้ป่วย',
      bodySystemFallback: 'กรณีศึกษา',
      patientProfile: 'ข้อมูลผู้ป่วย',
      supportTitle: 'แนวทางการประเมิน',
      support:
        'ระบบตรวจคำตอบตาม rubric จากเอกสาร โดยให้คะแนนตาม keyword และแนวคิดสำคัญของแต่ละงาน นักศึกษามีโอกาสทดลอง 2 ครั้งต่อข้อ',
      modeTitle: 'รูปแบบการเรียนรู้',
      mode: 'ฝึกทีละงานตามเอกสาร V2 Scenario Back pain',
      workflowLabel: 'ลำดับงานตามเอกสาร',
      workflowTitle: 'ทำแบบฝึกตาม rubric ทั้ง 5 งาน',
      workflowBody:
        'เลือกงานที่ต้องการทำ ระบบจะแสดงฟอร์มเฉพาะหัวข้อนั้นและให้ feedback พร้อมคะแนน',
      points: 'คะแนน',
      pass: 'ผ่าน',
      start: 'ทำข้อนี้',
      active: 'กำลังทำ',
    },
    en: {
      back: 'Back to Dashboard',
      assessment: 'Clinical Assessment',
      scenarioLabel: 'Clinical Scenario',
      bodySystemFallback: 'Clinical Case',
      patientProfile: 'Patient Profile',
      supportTitle: 'Evaluation Support',
      support:
        'The system evaluates answers against the document rubric using required clinical concepts. Students have 2 attempts per task.',
      modeTitle: 'Learning mode',
      mode: 'Step-by-step practice based on V2 Scenario Back pain',
      workflowLabel: 'Document workflow',
      workflowTitle: 'Complete all 5 rubric tasks',
      workflowBody:
        'Choose a task. The system shows a structured form and returns score-based feedback.',
      points: 'points',
      pass: 'pass',
      start: 'Start task',
      active: 'Current task',
    },
  }[lang]

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
                  {lang === 'th' ? scenario.title : 'Acute Lower Back Pain'}
                </h1>
              </div>

              <span className="inline-flex w-fit items-center rounded-full border border-white/50 bg-white/20 px-4 py-1.5 text-sm font-semibold text-white">
                {scenario.bodySystem || copy.bodySystemFallback}
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.65fr_1fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5821F] text-base font-bold text-white">
                    1
                  </div>

                  <div>
                    <h2 className="text-base font-bold uppercase tracking-[0.08em] text-slate-950">
                      {copy.patientProfile}
                    </h2>

                    <p className="mt-3 text-base leading-8 text-slate-800">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <h2 className="text-base font-bold uppercase tracking-[0.08em] text-slate-950">
                {copy.supportTitle}
              </h2>

              <p className="mt-3 text-base leading-8 text-slate-800">
                {copy.support}
              </p>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-base font-bold text-slate-950">
                  {copy.modeTitle}
                </p>
                <p className="mt-2 text-base leading-7 font-medium text-slate-700">
                  {copy.mode}
                </p>
              </div>
            </aside>
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
                    href={`/dashboard/scenario/${scenario.id}?stepId=${step.id}&lang=${lang}`}
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

        <ScenarioStepPractice
          key={`${targetStep?.id ?? 'no-step'}-${
            latestAttemptStep?.attemptCount ?? 0
          }-${latestAttemptStep?.isLocked ?? false}-${lang}`}
          lang={lang}
          scenarioId={scenario.id}
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
        />
      </main>
    </div>
  )
}
