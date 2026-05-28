// src/app/dashboard/scenario/[id]/success/page.tsx

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/utils/prisma'

type SuccessPageProps = {
  searchParams: Promise<{
    attemptId?: string
  }>
}

function getScoreStyles(score: string | null) {
  if (score === 'correct') {
    return {
      box: 'bg-green-50 border-green-500 text-green-800',
      badge: 'bg-green-100 text-green-800',
      label: 'Correct',
    }
  }

  if (score === 'partial') {
    return {
      box: 'bg-yellow-50 border-yellow-500 text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-800',
      label: 'Partial',
    }
  }

  if (score === 'incorrect') {
    return {
      box: 'bg-red-50 border-red-500 text-red-800',
      badge: 'bg-red-100 text-red-800',
      label: 'Incorrect',
    }
  }

  return {
    box: 'bg-slate-50 border-slate-400 text-slate-800',
    badge: 'bg-slate-100 text-slate-800',
    label: 'Unknown',
  }
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const attemptId = params.attemptId

  if (!attemptId) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const extractedStudentId = user.email?.split('@')[0]

  if (!extractedStudentId) {
    redirect('/login')
  }

  const attempt = await prisma.attempt.findUnique({
    where: {
      id: attemptId,
    },
    include: {
      scenario: true,
      student: true,
    },
  })

  if (!attempt) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-700">Attempt Not Found</h1>
          <p className="mt-3 text-slate-600">
            The submitted assessment record could not be found.
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#aa1e2d]"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  if (attempt.student.studentId !== extractedStudentId) {
    redirect('/dashboard')
  }

  const scoreStyles = getScoreStyles(attempt.aiScore)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-200 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✓
            </div>

            <h1 className="text-3xl font-extrabold text-green-700">
              Assessment Submitted
            </h1>

            <p className="mt-2 text-slate-600">
              Your clinical assessment has been securely saved to the database.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-bold text-slate-900">
              Scenario: {attempt.scenario?.title ?? 'Unknown Scenario'}
            </h2>

            <div className="mt-5 grid gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">
                  Your Diagnosis
                </p>
                <p className="mt-1 rounded-lg bg-white p-3 text-slate-900">
                  {attempt.primaryDiagnosis || 'No diagnosis submitted.'}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600">
                  Your Interventions
                </p>
                <p className="mt-1 rounded-lg bg-white p-3 text-slate-900">
                  {attempt.interventions || 'No interventions submitted.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-900">
              AI Evaluation Feedback
            </h2>

            {attempt.aiStatus === 'completed' && (
              <div className="mt-5 space-y-5">
                <div
                  className={`flex flex-col gap-3 rounded-xl border-l-4 p-5 sm:flex-row sm:items-center sm:justify-between ${scoreStyles.box}`}
                >
                  <div>
                    <p className="text-sm font-semibold opacity-80">
                      Overall Score
                    </p>
                    <p className="text-lg font-bold">
                      AI evaluation completed successfully.
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-black uppercase tracking-wide ${scoreStyles.badge}`}
                  >
                    {scoreStyles.label}
                  </span>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                  <h3 className="font-bold text-blue-900">
                    Detailed Reasoning
                  </h3>
                  <p className="mt-2 leading-relaxed text-slate-800">
                    {attempt.aiReasoning || 'No reasoning was provided.'}
                  </p>
                </div>

                {attempt.aiMissingElements.length > 0 && (
                  <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
                    <h3 className="font-bold text-orange-900">
                      Areas for Improvement
                    </h3>

                    <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-800">
                      {attempt.aiMissingElements.map((element, index) => (
                        <li key={`${element}-${index}`}>{element}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.aiMissingElements.length === 0 && (
                  <div className="rounded-xl border border-green-100 bg-green-50 p-5">
                    <h3 className="font-bold text-green-900">
                      No Missing Elements Found
                    </h3>
                    <p className="mt-2 text-slate-800">
                      The submitted answer met the required rubric elements.
                    </p>
                  </div>
                )}
              </div>
            )}

            {attempt.aiStatus === 'failed' && (
              <div className="mt-5 rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-5">
                <h3 className="text-lg font-bold text-yellow-900">
                  AI Feedback Temporarily Unavailable
                </h3>
                <p className="mt-2 text-slate-800">
                  Your assessment was saved successfully. AI feedback could not
                  be generated at this moment. Please check again later or wait
                  for faculty review.
                </p>
              </div>
            )}

            {attempt.aiStatus === 'pending' && (
              <div className="mt-5 rounded-xl border-l-4 border-slate-400 bg-slate-50 p-5">
                <h3 className="text-lg font-bold text-slate-800">
                  Evaluation Pending
                </h3>
                <p className="mt-2 text-slate-600">
                  Your submission has been saved and is waiting for AI
                  evaluation.
                </p>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex justify-center rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#aa1e2d]"
            >
              Return to Dashboard
            </Link>

            <Link
              href={`/dashboard/scenario/${attempt.scenarioId}`}
              className="inline-flex justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Try Again
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}