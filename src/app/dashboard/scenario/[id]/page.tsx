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

  const latestAttemptStep =
    resolvedSearchParams.attemptId && resolvedSearchParams.stepId
      ? await prisma.attemptStep.findFirst({
          where: {
            attemptId: resolvedSearchParams.attemptId,
            scenarioStepId: resolvedSearchParams.stepId,
            attempt: {
              scenarioId: scenario.id,
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
      : null

  return (
    <div className="min-h-screen bg-[#f8f6f3] pb-12 font-sans text-slate-900">
      <header className="sticky top-0 z-10 border-b border-[#e8e0d5] bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-[#8C1515]"
          >
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#C8963C]" />
            <span className="text-sm font-bold text-[#8C1515]">
              Clinical Assessment
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-[#8C1515] px-6 py-5 text-white sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C8963C]">
                  Clinical Scenario
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {scenario.title}
                </h1>
              </div>

              <span className="inline-flex w-fit items-center rounded-full border border-[#C8963C]/50 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                {scenario.bodySystem || 'Clinical Case'}
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
            <div className="p-6 sm:p-8">
              <div className="rounded-xl border border-slate-200 bg-[#f8f6f3] p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C8963C]/40 bg-[#FDF3E3] text-sm font-bold text-[#8C1515]">
                    1
                  </div>

                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#8C1515]">
                      Patient Presentation
                    </h2>

                    <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-[#E8F4F1] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#8C1515]">
                Evaluation Support
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-700">
                Submit your clinical assessment using Thai text or voice input
                when available. The system checks required clinical concepts
                first and uses AI semantic feedback when deeper review is
                needed.
              </p>

              <div className="mt-5 rounded-xl border border-teal-200 bg-white/70 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Current learning mode
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Step-by-step practice with final assessment support.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8C1515]">
                Scenario Workflow
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Review the clinical steps
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                These steps represent the intended clinical reasoning path for
                this case. Step-by-step practice is introduced carefully while
                keeping the final assessment form available.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-[#C8963C]/40 bg-[#FDF3E3] px-3 py-1 text-sm font-semibold text-[#8C1515]">
              {scenario.steps.length} steps
            </span>
          </div>

          {scenario.steps.length > 0 ? (
            <div className="space-y-4">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(
                    scenario.steps.length,
                    11,
                  )}, minmax(0, 1fr))`,
                }}
              >
                {scenario.steps.slice(0, 11).map((step) => (
                  <div
                    key={step.id}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8C1515] text-xs font-bold text-white">
                      {step.order}
                    </div>
                    <div className="h-1 w-full rounded-full bg-[#C8963C]/30" />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {scenario.steps.map((step) => (
                  <article
                    key={step.id}
                    className="rounded-xl border border-slate-200 bg-[#f8f6f3] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C8963C]/40 bg-white text-sm font-bold text-[#8C1515]">
                        {step.order}
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-950">
                          {step.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {step.prompt}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-[#f8f6f3] p-5 text-sm text-slate-500">
              No scenario steps have been configured for this case yet.
            </div>
          )}
        </section>

        <ScenarioStepPractice
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8C1515]">
              Final Assessment
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Submit your complete assessment
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
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