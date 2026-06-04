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

type ResultContent = {
  title: string
  label: string
  summary: string
  accentColor: string
  badgeBg: string
  badgeText: string
  dotColor: string
  stripColor: string
}

function getResultContent(score: string | null): ResultContent {
  if (score === 'correct') {
    return {
      title: 'Complete Clinical Response',
      label: 'Complete',
      summary:
        'The response includes the required clinical ideas for this scenario.',
      accentColor: '#16a34a',
      badgeBg: '#f0fdf4',
      badgeText: '#15803d',
      dotColor: '#16a34a',
      stripColor: '#16a34a',
    }
  }

  if (score === 'partial') {
    return {
      title: 'Response Needs Improvement',
      label: 'Needs Improvement',
      summary:
        'The response is partly correct, but some required clinical ideas should be added.',
      accentColor: '#C8963C',
      badgeBg: '#fffbeb',
      badgeText: '#92400e',
      dotColor: '#C8963C',
      stripColor: '#C8963C',
    }
  }

  if (score === 'incorrect') {
    return {
      title: 'Response Needs Review',
      label: 'Needs Review',
      summary:
        'The response needs more clinical detail before it can be considered complete.',
      accentColor: '#8C1515',
      badgeBg: '#fff1f2',
      badgeText: '#9f1239',
      dotColor: '#8C1515',
      stripColor: '#8C1515',
    }
  }

  return {
    title: 'Evaluation Pending',
    label: 'Pending',
    summary: 'The response has been submitted and is waiting for evaluation.',
    accentColor: '#64748b',
    badgeBg: '#f8fafc',
    badgeText: '#475569',
    dotColor: '#64748b',
    stripColor: '#64748b',
  }
}

function formatMissingElement(element: string) {
  const normalized = element.trim().toLowerCase()

  const readableElements: Record<string, string> = {
    'back pain': 'Identify the lower back pain problem',
    assessment: 'Assess pain details and present illness',
    'red flags': 'Screen for red flag symptoms',
    rest: 'Provide initial rest and activity advice',
    'medical care': 'Recommend medical care or referral when needed',
    'clinical assessment': 'Assess pain details and present illness',
    'red flag screening': 'Screen for red flag symptoms',
    'referral or medical care': 'Recommend medical care or referral when needed',
    'nursing advice': 'Provide appropriate initial nursing advice',
  }

  return (
    readableElements[normalized] ||
    element
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

function getFeedbackSummary(reasoning: string | null, score: string | null) {
  if (reasoning && reasoning.trim()) {
    return reasoning
      .replace(/^The student failed to provide/i, 'The response is missing')
      .replace(/^Student failed to provide/i, 'The response is missing')
      .replace(/\bfailed\b/gi, 'did not include')
  }

  if (score === 'correct') {
    return 'The response covers the expected clinical ideas for this scenario. Continue practicing to improve clarity, confidence, and clinical communication.'
  }

  return 'The response is missing some required clinical ideas. Review the improvement guidance below and try again with a more complete clinical answer.'
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const attemptId = params.attemptId

  if (!attemptId) redirect('/dashboard')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const extractedStudentId = user.email?.split('@')[0]
  if (!extractedStudentId) redirect('/login')

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { scenario: true, student: true },
  })

  if (!attempt) {
    return (
      <main className="min-h-screen bg-[#f5f3ef] px-6 py-16 text-slate-900">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-base font-semibold text-[#8C1515]">
            Assessment record not found
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            The submitted assessment record could not be found. Please return to
            the dashboard and open the scenario again.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-full bg-[#8C1515] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#741111]"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  if (attempt.student.studentId !== extractedStudentId) redirect('/dashboard')

  const result = getResultContent(attempt.aiScore)
  const feedbackSummary = getFeedbackSummary(attempt.aiReasoning, attempt.aiScore)
  const hasMissingElements = attempt.aiMissingElements.length > 0

  return (
    <main className="min-h-screen bg-[#f5f3ef] text-slate-900">

      {/* ─── Header ─── */}
      <header className="border-b border-[#e2d9cb] bg-white">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-8 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C8963C]">
              Clinical Scenario Learning
            </p>
            <h1 className="mt-0.5 text-xl font-semibold text-[#8C1515]">
              Assessment Feedback
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#8C1515] underline-offset-4 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* ─── Page body ─── */}
      <div className="mx-auto max-w-screen-xl px-8 py-10">

        {/* ─── Scenario info ─── */}
        <section className="rounded-2xl border border-[#e2d9cb] bg-white px-10 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C8963C]">
                Scenario Result
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {attempt.scenario?.title ?? 'Clinical Scenario'}
              </h2>
            </div>
            <span className="rounded-full border border-[#e2d9cb] bg-[#faf8f4] px-4 py-1.5 text-sm font-medium text-slate-700">
              {attempt.scenario?.bodySystem ?? 'Clinical Practice'}
            </span>
          </div>
          {attempt.scenario?.description && (
            <p className="mt-4 text-[15px] leading-7 text-slate-600">
              {attempt.scenario.description}
            </p>
          )}
        </section>

        {/* ─── Result banner ─── */}
        <section
          className="mt-4 rounded-2xl border bg-white px-10 py-7"
          style={{ borderColor: result.accentColor, borderLeftWidth: '5px' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: result.dotColor }}
              />
              <div>
                <p className="text-[13px] font-medium uppercase tracking-wider text-slate-800">
                  Overall Result
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {result.title}
                </h3>
                <p className="mt-1.5 text-[15px] leading-7 text-slate-600">
                  {result.summary}
                </p>
              </div>
            </div>
            <span
              className="rounded-full border px-5 py-2 text-sm font-semibold"
              style={{
                borderColor: result.accentColor,
                backgroundColor: result.badgeBg,
                color: result.badgeText,
              }}
            >
              {result.label}
            </span>
          </div>
        </section>

        {/* ─── Feedback ─── */}
        <section className="mt-4 rounded-2xl border border-[#e2d9cb] bg-white px-10 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C8963C]">
            Feedback
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">
            Clinical Guidance
          </h3>

          {attempt.aiStatus === 'completed' && (
            <p className="mt-4 text-[15px] leading-7 text-slate-700">
              {feedbackSummary}
            </p>
          )}

          {attempt.aiStatus === 'failed' && (
            <div className="mt-4 rounded-xl border border-[#fcd9a0] bg-[#fffbeb] p-5">
              <p className="text-sm font-semibold text-[#92400e]">
                Feedback temporarily unavailable
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                The assessment was submitted successfully, but feedback could
                not be generated at this moment. Please try again later or ask
                the instructor for review.
              </p>
            </div>
          )}

          {attempt.aiStatus === 'pending' && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-800">
                Evaluation pending
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                The submission has been received and is waiting for evaluation.
              </p>
            </div>
          )}

          {attempt.aiStatus === 'completed' && (
            <div className="mt-7 border-t border-slate-200 pt-7">
              {hasMissingElements ? (
                <>
                  <h4 className="text-base font-semibold text-slate-900">
                    Recommended Improvements
                  </h4>
                  <p className="mt-1.5 text-[15px] leading-7 text-slate-600">
                    Add these clinical points to make the response more
                    complete.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {attempt.aiMissingElements.map((element, index) => (
                      <li
                        key={`${element}-${index}`}
                        className="flex items-start gap-3 text-[15px] leading-7 text-slate-700"
                      >
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8C1515]" />
                        <span>{formatMissingElement(element)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-6">
                  <h4 className="text-base font-semibold text-[#15803d]">
                    No major missing elements found
                  </h4>
                  <p className="mt-2 text-[15px] leading-7 text-slate-700">
                    The submitted answer covers the expected clinical ideas for
                    this scenario. Continue practicing to improve clarity and
                    confidence.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── Submitted answer ─── */}
        <section className="mt-4 rounded-2xl border border-[#e2d9cb] bg-white px-10 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C8963C]">
            Submitted Answer
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">
            Your Response
          </h3>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
                Assessment / Diagnosis
              </p>
              <div className="mt-3 min-h-32 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="whitespace-pre-line text-[15px] leading-7 text-slate-800">
                  {attempt.primaryDiagnosis || 'No diagnosis submitted.'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
                Nursing Interventions
              </p>
              <div className="mt-3 min-h-32 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="whitespace-pre-line text-[15px] leading-7 text-slate-800">
                  {attempt.interventions || 'No interventions submitted.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Actions ─── */}
        <div className="mt-10 mb-6 flex flex-row items-center justify-center gap-4">
          <Link
            href={`/dashboard/scenario/${attempt.scenarioId}`}
            className="rounded-full bg-[#8C1515] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#741111]"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#d4c9b5] bg-white px-10 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8C1515] hover:text-[#8C1515]"
          >
            Return to Dashboard
          </Link>
        </div>

      </div>
    </main>
  )
}
