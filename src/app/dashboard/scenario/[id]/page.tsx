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
    <div className="min-h-screen bg-[#F4F2EE] pb-12 font-sans text-[#111827]">
      <header className="sticky top-0 z-10 border-b border-[#DED8CF] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8B1E16] transition-colors hover:text-[#70170F]"
          >
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C8963C]" />
            <span className="text-sm font-medium text-[#8B1E16]">
              Clinical Assessment
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 w-full max-w-[1440px] space-y-6 px-5 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-2xl border border-[#DED8CF] bg-white shadow-sm">
          <div className="border-b border-[#7A1813] bg-[#8B1E16] px-7 py-6 text-white sm:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#D6A84F]">
                  Clinical Scenario
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {scenario.title}
                </h1>
              </div>

              <span className="inline-flex w-fit items-center rounded-full border border-[#D6A84F]/60 bg-white/10 px-4 py-1.5 text-sm font-medium text-white">
                {scenario.bodySystem || 'Clinical Case'}
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.7fr_1fr]">
            <div className="p-7 sm:p-10">
              <div className="rounded-2xl border border-[#DED8CF] bg-[#FAF9F7] p-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6A84F]/50 bg-[#F7EAD2] text-base font-medium text-[#8B1E16]">
                    1
                  </div>

                  <div>
                    <h2 className="text-base font-semibold uppercase tracking-[0.08em] text-[#8B1E16]">
                      Patient Presentation
                    </h2>

                    <p className="mt-4 text-base leading-8 text-[#1F2937]">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="border-t border-[#DED8CF] bg-[#EEF7F5] p-7 sm:p-10 lg:border-l lg:border-t-0">
              <h2 className="text-base font-semibold uppercase tracking-[0.08em] text-[#8B1E16]">
                Evaluation Support
              </h2>

              <p className="mt-4 text-base leading-8 text-[#1F2937]">
                Submit your clinical assessment using Thai text or voice input
                when available. The system checks required clinical concepts
                first and uses AI semantic feedback when deeper review is
                needed.
              </p>

              <div className="mt-6 rounded-2xl border border-[#B7DDD6] bg-white p-5">
                <p className="text-base font-semibold text-[#111827]">
                  Current learning mode
                </p>
                <p className="mt-3 text-base leading-7 text-[#1F2937]">
                  Step-by-step practice with final assessment support.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-[#DED8CF] bg-white p-7 shadow-sm sm:p-10">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#8B1E16]">
                Scenario Workflow
              </p>

              <h2 className="mt-3 text-2xl font-semibold text-[#111827]">
                Review the clinical steps
              </h2>

              <p className="mt-3 max-w-4xl text-base leading-8 text-[#1F2937]">
                These steps represent the intended clinical reasoning path for
                this case. Step-by-step practice is introduced carefully while
                keeping the final assessment form available.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-[#D6A84F]/50 bg-[#F7EAD2] px-4 py-1.5 text-sm font-medium text-[#8B1E16]">
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B1E16] text-sm font-medium text-white">
                      {step.order}
                    </div>
                    <div className="h-1 w-full rounded-full bg-[#D6A84F]/35" />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {scenario.steps.map((step) => (
                  <article
                    key={step.id}
                    className="rounded-2xl border border-[#DED8CF] bg-[#FAF9F7] p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6A84F]/50 bg-white text-base font-medium text-[#8B1E16]">
                        {step.order}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-[#111827]">
                          {step.title}
                        </h3>

                        <p className="mt-3 text-base leading-7 text-[#1F2937]">
                          {step.prompt}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#CFC8BE] bg-[#FAF9F7] p-5 text-base leading-7 text-[#1F2937]">
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

        <section className="rounded-2xl border border-[#DED8CF] bg-white p-7 shadow-sm sm:p-10">
          <div className="mb-7">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#8B1E16]">
              Final Assessment
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-[#111827]">
              Submit your complete assessment
            </h2>

            <p className="mt-3 text-base leading-8 text-[#1F2937]">
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