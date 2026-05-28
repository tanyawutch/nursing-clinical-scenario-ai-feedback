import { createClient } from '@/utils/supabase/server'
import prisma from '@/utils/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import AssessmentForm from './AssessmentForm'

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const scenarioId = resolvedParams.id

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-slate-500 hover:text-[#aa1e2d] transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <div className="text-sm font-bold text-slate-800">
            Clinical Assessment
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-t-[#aa1e2d] p-6">
          <div className="flex justify-between items-start gap-4 mb-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {scenario.title}
            </h1>

            <span className="inline-flex items-center rounded-md bg-[#fff5f5] px-2.5 py-1 text-sm font-semibold text-[#aa1e2d] ring-1 ring-inset ring-[#aa1e2d]/20">
              {scenario.bodySystem}
            </span>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
              Patient Presentation
            </h3>
            <p className="text-slate-700 leading-relaxed">
              {scenario.description}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Scenario Steps
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Review the clinical workflow before submitting your assessment.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {scenario.steps.length} steps
            </span>
          </div>

          {scenario.steps.length > 0 ? (
            <div className="space-y-3">
              {scenario.steps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#aa1e2d] text-sm font-bold text-white">
                      {step.order}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {step.prompt}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No scenario steps have been configured for this case yet.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Your Assessment
          </h2>
          <AssessmentForm scenarioId={scenario.id} />
        </div>
      </main>
    </div>
  )
}