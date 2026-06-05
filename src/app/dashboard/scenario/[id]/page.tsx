import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import AssessmentForm from './AssessmentForm'
import ScenarioStepPractice from './ScenarioStepPractice'
import prisma from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ attemptId?: string; stepId?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const scenarioId = resolvedParams.id

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
  const targetStepId = resolvedSearchParams.stepId ?? firstStep?.id ?? null

  const latestAttemptStep =
    targetStepId && resolvedSearchParams.attemptId
      ? await prisma.attemptStep.findFirst({
          where: {
            attemptId: resolvedSearchParams.attemptId,
            scenarioStepId: targetStepId,
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
            attemptCount: true,
            isLocked: true,
            modelAnswerRevealed: true,
          },
        })
      : targetStepId
        ? await prisma.attemptStep.findFirst({
            where: {
              scenarioStepId: targetStepId,
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
              attemptCount: true,
              isLocked: true,
              modelAnswerRevealed: true,
            },
          })
        : null

  return (
    <div className="min-h-screen bg-slate-100 pb-12 font-sans text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#A73535] transition-colors hover:text-[#8E2B2B]"
          >
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-[#A73535]" />
            <span className="text-sm font-semibold text-slate-800">
              Clinical Assessment
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 w-full max-w-[1440px] space-y-6 px-5 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#A73535] px-7 py-7 text-white sm:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {/* Fix 1: text-white/90 → text-white */}
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-white">
                  Clinical Scenario
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {scenario.title}
                </h1>
              </div>

              {/* Fix 2: bg-white/15 border-white/35 → bg-white/20 border-white/50 */}
              <span className="inline-flex w-fit items-center rounded-full border border-white/50 bg-white/20 px-4 py-1.5 text-sm font-semibold text-white">
                {scenario.bodySystem || 'Clinical Case'}
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.65fr_1fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A73535] text-base font-bold text-white">
                    1
                  </div>

                  <div>
                    <h2 className="text-base font-bold uppercase tracking-[0.08em] text-slate-950">
                      Patient Presentation
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
                Evaluation Support
              </h2>

              <p className="mt-3 text-base leading-8 text-slate-800">
                The system first checks the key clinical points in the student
                response. If the answer needs deeper interpretation, AI
                feedback is used to support learning.
              </p>

              {/* Fix 3: blue → neutral white/slate */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-base font-bold text-slate-950">
                  Current learning mode
                </p>
                <p className="mt-2 text-base leading-7 font-medium text-slate-700">
                  Step-by-step practice with final assessment support.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#A73535]">
                Scenario Workflow
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Review the clinical steps
              </h2>

              <p className="mt-3 text-base leading-8 text-slate-800">
                These steps show the expected clinical reasoning path for this
                case. Students can practice step by step while the final
                assessment form remains available.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900">
              {scenario.steps.length} steps
            </span>
          </div>

          {scenario.steps.length > 0 ? (
            <div className="space-y-5">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(
                    scenario.steps.length,
                    11
                  )}, minmax(0, 1fr))`,
                }}
              >
                {scenario.steps.slice(0, 11).map((step) => (
                  <div
                    key={step.id}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A73535] text-sm font-bold text-white">
                      {step.order}
                    </div>
                    <div className="h-1 w-full rounded-full bg-slate-200" />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {scenario.steps.map((step) => (
                  <article
                    key={step.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-base font-bold text-blue-900">
                        {step.order}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-950">
                          {step.title}
                        </h3>

                        {/* Fix 4: font-medium → font-normal */}
                        <p className="mt-3 text-base leading-7 text-slate-800">
                          {step.prompt}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-base leading-7 font-medium text-slate-800">
              No scenario steps have been configured for this case yet.
            </div>
          )}
        </section>

        <ScenarioStepPractice
          key={`${firstStep?.id ?? 'no-step'}-${
            latestAttemptStep?.attemptCount ?? 0
          }-${latestAttemptStep?.isLocked ?? false}`}
          scenarioId={scenario.id}
          step={
            firstStep
              ? {
                  id: firstStep.id,
                  order: firstStep.order,
                  title: firstStep.title,
                  prompt: firstStep.prompt,
                  modelAnswer: firstStep.modelAnswer,
                }
              : null
          }
          latestAttemptStep={latestAttemptStep}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#A73535]">
              Final Assessment
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Submit your complete assessment
            </h2>

            <p className="mt-3 text-base leading-8 text-slate-800">
              Provide your primary nursing diagnosis and recommended immediate
              nursing interventions. Thai responses are supported.
            </p>
          </div>

          <AssessmentForm scenarioId={scenario.id} />
        </section>
      </main>
    </div>
  )
}