// src/app/dashboard/scenario/[id]/success/page.tsx

import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from '@/app/components/LogoutButton'
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
}

// Logic: Untouched
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
    }
  }

  if (score === 'partial') {
    return {
      title: 'Response Needs Improvement',
      label: 'Needs Improvement',
      summary:
        'The response is partly correct, but some required clinical ideas should be added.',
      accentColor: '#A73535',
      badgeBg: '#fff5f5',
      badgeText: '#A73535',
      dotColor: '#A73535',
    }
  }

  if (score === 'incorrect') {
    return {
      title: 'Response Needs Review',
      label: 'Needs Review',
      summary:
        'The response needs more clinical detail before it can be considered complete.',
      accentColor: '#A73535',
      badgeBg: '#fff1f2',
      badgeText: '#9f1239',
      dotColor: '#A73535',
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
  }
}

// Logic: Untouched
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

// Logic: Untouched
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

// Server Component Logic: Untouched
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
      <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-base font-bold text-[#A73535]">
            Assessment record not found
          </p>
          <p className="mt-3 text-base leading-8 text-slate-800">
            The submitted assessment record could not be found. Please return to
            the dashboard and open the scenario again.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-full bg-[#A73535] px-7 py-3 text-sm font-bold text-white shadow-md shadow-[#A73535]/20 transition-all hover:-translate-y-0.5 hover:bg-[#8E2B2B]"
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

  // UI Theme Variables for Coursera Style
  const isPass = attempt.aiScore === 'correct'
  const isFail = attempt.aiScore === 'partial' || attempt.aiScore === 'incorrect'

  // Coursera Style Soft Banner Backgrounds
  const bannerBg = isPass ? 'bg-[#e6f4ea]' : isFail ? 'bg-[#fce8e8]' : 'bg-slate-100'
  const feedbackBoxBg = isPass ? 'bg-green-50' : isFail ? 'bg-rose-50' : 'bg-slate-50'
  const feedbackBorder = isPass ? 'border-green-200' : isFail ? 'border-rose-200' : 'border-slate-200'
  
  // Text Colors
  const themeText = isPass ? 'text-green-700' : isFail ? 'text-[#A73535]' : 'text-slate-700'
  const dotColor = isPass ? 'bg-green-600' : isFail ? 'bg-[#A73535]' : 'bg-slate-600'

  // Primary Button Theme
  const btnBg = isPass ? 'bg-[#15803d] hover:bg-[#166534] shadow-green-700/25' : isFail ? 'bg-[#A73535] hover:bg-[#8E2B2B] shadow-[#A73535]/25' : 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/25'

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-20 font-sans">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900"
            >
              <span aria-hidden="true">←</span>
              Back
            </Link>
            <div className="h-4 w-[1px] bg-slate-300"></div>
            <p className="text-sm font-bold text-slate-900">
              {attempt.scenario?.title ?? 'Clinical Scenario Learning'}
            </p>
          </div>
          <div className="hidden sm:block text-sm font-semibold text-slate-500">
            <div className="flex items-center gap-3">
              <span>Practice Assessment Feedback</span>
              <LogoutButton lang="en" />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Coursera-style Top Verdict Banner ─── */}
      <div className={`w-full ${bannerBg} py-6 sm:py-8`}>
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          
          {/* Left: Grade/Result Text */}
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
                Overall Result:
              </h2>
              <span className={`text-xl font-bold sm:text-2xl ${themeText}`}>
                {result.title}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-slate-800">
              {result.summary}
            </p>
          </div>

          {/* Right: Action Button */}
          <div className="shrink-0">
            <Link
              href={`/dashboard/scenario/${attempt.scenarioId}`}
              className={`inline-flex items-center justify-center rounded-xl px-7 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${btnBg}`}
            >
              <svg className="mr-2 -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {isPass ? 'Practice Again' : 'Retry Assessment'}
            </Link>
          </div>

        </div>
      </div>

      {/* ─── Main Content Container (Structured Review Layout) ─── */}
      <div className="mx-auto mt-8 max-w-5xl px-5 sm:px-8 lg:px-10">
        
        {/* ─── Unified Review Paper Card ─── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          
          {/* Header of the Card */}
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-950">Submitted Response Review</h3>
              
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-900 shadow-sm">
                {attempt.scenario?.bodySystem ?? 'Clinical Practice'}
              </span>
            </div>
          </div>

          {/* Q1: Primary Diagnosis */}
          <div className="border-b border-slate-100 px-6 py-8 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <h4 className="text-base font-bold text-slate-950">
                1. What is your primary nursing diagnosis?
              </h4>
            </div>
            <div className="mt-4 min-h-[120px] rounded-xl border border-slate-200/80 bg-slate-50/80 p-6 shadow-inner">
              <p className="whitespace-pre-line text-base leading-8 text-slate-800">
                {attempt.primaryDiagnosis || 'No diagnosis submitted.'}
              </p>
            </div>
          </div>

          {/* Q2: Interventions */}
          <div className="px-6 py-8 sm:px-8">
            <h4 className="text-base font-bold text-slate-950">
              2. Recommended immediate nursing interventions
            </h4>
            <div className="mt-4 min-h-[120px] rounded-xl border border-slate-200/80 bg-slate-50/80 p-6 shadow-inner">
              <p className="whitespace-pre-line text-base leading-8 text-slate-800">
                {attempt.interventions || 'No interventions submitted.'}
              </p>
            </div>
          </div>

          {/* ─── Coursera-style Evaluation Box ─── */}
          <div className={`border-t ${feedbackBorder} ${feedbackBoxBg} p-6 sm:p-8`}>
            
            {/* Status Header (Nice Work / Try Again) */}
            <div className="flex items-center gap-3">
              {isPass ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100">
                  <svg className="h-5 w-5 text-[#A73535]" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <h4 className={`text-lg font-bold ${themeText}`}>
                {isPass ? 'Nice work' : 'Try again'}
              </h4>
            </div>

            {/* AI Feedback Summary */}
            {(attempt.aiStatus === 'completed' || attempt.aiStatus === 'pending') && (
              <p className="mt-4 text-base leading-8 text-slate-800">
                {attempt.aiStatus === 'completed' ? feedbackSummary : 'The submission has been received and is waiting for evaluation.'}
              </p>
            )}

            {/* Missing Elements List */}
            {attempt.aiStatus === 'completed' && hasMissingElements && (
              <ul className="mt-5 space-y-3">
                {attempt.aiMissingElements.map((element, index) => (
                  <li
                    key={`${element}-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/80 px-5 py-3.5 text-base leading-8 text-slate-900 shadow-sm"
                  >
                    <span className={`mt-3.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                    <span className="font-medium">{formatMissingElement(element)}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* API Failure Fallback */}
            {attempt.aiStatus === 'failed' && (
              <p className="mt-4 text-base leading-8 text-slate-800">
                The assessment was submitted successfully, but feedback could not be generated at this moment. Please try again later or ask the instructor for review.
              </p>
            )}

          </div>
        </div>

        {/* ─── Bottom Actions ─── */}
        <div className="mt-8 mb-8 flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900"
          >
            Return to Dashboard
          </Link>
        </div>
        
      </div>
    </main>
  )
}