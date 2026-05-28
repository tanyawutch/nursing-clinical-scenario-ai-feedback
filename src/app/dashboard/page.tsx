import Link from 'next/link'
import { redirect } from 'next/navigation'
import prisma from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const studentId = user.email?.split('@')[0] ?? 'Student'

  const scenarios = await prisma.scenario.findMany({
    orderBy: {
      title: 'asc',
    },
  })

  const scenarioCount = scenarios.length
  const bodySystemCount = new Set(
    scenarios.map((scenario) => scenario.bodySystem).filter(Boolean),
  ).size

  return (
    <div className="min-h-screen bg-[#f8f6f3] font-sans text-slate-900">
      <header className="border-b border-[#8C1515]/20 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C8963C] bg-[#8C1515]">
              <span className="text-xs font-bold tracking-wide text-[#C8963C]">
                MFU
              </span>
            </div>

            <div>
              <h1 className="text-lg font-bold text-[#8C1515] sm:text-xl">
                Clinical Scenario Learning
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Web-based clinical scenario practice with AI feedback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-[#f8f6f3] px-3 py-1.5 text-xs font-semibold text-slate-700 sm:text-sm">
              ID: {studentId}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white">
          <div className="grid gap-0 lg:grid-cols-[1.6fr_1fr]">
            <div className="p-6 sm:p-8">
              <span className="inline-flex items-center rounded-full border border-[#8C1515]/20 bg-[#f8f6f3] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#8C1515]">
                Primary Medical Care
              </span>

              <h2 className="mt-4 max-w-3xl text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Practice clinical reasoning through guided patient scenarios.
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Select a clinical case, submit your assessment, and receive
                structured feedback. The current learning flow supports
                Thai-first responses with AI semantic review when deeper
                evaluation is needed.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-[#f8f6f3] p-4">
                  <p className="text-2xl font-bold text-[#8C1515]">
                    {scenarioCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Available scenarios
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#f8f6f3] p-4">
                  <p className="text-2xl font-bold text-[#8C1515]">
                    {bodySystemCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Body systems
                  </p>
                </div>

                <div className="rounded-xl border border-[#C8963C]/30 bg-[#FDF3E3] p-4">
                  <p className="text-2xl font-bold text-[#8C1515]">AI</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Feedback supported
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-[#E8F4F1] p-6 lg:border-l lg:border-t-0 sm:p-8">
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold text-[#8C1515]">
                    Current Demo Focus
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">
                    Acute Lower Back Pain
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    This MVP focuses on one polished Back Pain scenario using a
                    hybrid evaluation engine: rule-based concept matching first,
                    then AI fallback when semantic review is required.
                  </p>
                </div>

                <div className="rounded-xl border border-teal-200 bg-white/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Evaluation approach
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Complete answers can receive fast feedback without calling
                    the AI model. Incomplete or unclear answers are reviewed by
                    Gemini for semantic evaluation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Available Scenarios
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a clinical case to begin your assessment.
              </p>
            </div>
          </div>

          {scenarios.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                No scenarios available yet
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Scenario content will appear here after it is added to the
                database.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {scenarios.map((scenario) => {
                const isBackPainDemo =
                  scenario.id === 'back-pain-scenario-001' ||
                  scenario.title.toLowerCase().includes('back pain')

                return (
                  <article
                    key={scenario.id}
                    className="flex min-h-[270px] flex-col rounded-2xl border border-slate-200 bg-white transition-colors hover:border-[#8C1515]/40"
                  >
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="inline-flex items-center rounded-full border border-[#8C1515]/20 bg-[#f8f6f3] px-3 py-1 text-xs font-semibold text-[#8C1515]">
                          {scenario.bodySystem || 'Clinical Scenario'}
                        </span>

                        {isBackPainDemo ? (
                          <span className="inline-flex items-center rounded-full border border-[#C8963C]/40 bg-[#FDF3E3] px-3 py-1 text-xs font-semibold text-[#8C1515]">
                            Demo ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                            Available
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold tracking-tight text-slate-950">
                        {scenario.title}
                      </h3>

                      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
                        {scenario.description}
                      </p>

                      <div className="mt-6 rounded-xl border border-slate-200 bg-[#EEF3FB] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Learning mode
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          Text response with AI-supported feedback
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/scenario/${scenario.id}`}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#8C1515] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#741111] focus:outline-none focus:ring-2 focus:ring-[#8C1515] focus:ring-offset-2"
                      >
                        Start Assessment
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}