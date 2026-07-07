import Link from 'next/link'
import { redirect } from 'next/navigation'
import LanguageToggle from '@/app/components/LanguageToggle'
import LogoutButton from '@/app/components/LogoutButton'
import prisma from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'

type PageLanguage = 'th' | 'en'

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
}

function formatDate(value: Date, lang: PageLanguage) {
  return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(value)
}

function getScoreLabel(score: string | null, lang: PageLanguage) {
  if (lang === 'en') {
    if (score === 'correct') return 'Passed'
    if (score === 'partial') return 'Needs review'
    if (score === 'incorrect') return 'Not yet passed'
    return 'Pending'
  }

  if (score === 'correct') return 'ผ่านเกณฑ์'
  if (score === 'partial') return 'ต้องปรับปรุง'
  if (score === 'incorrect') return 'ยังไม่ผ่าน'
  return 'รอตรวจ'
}

export default async function PracticeHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const lang = resolveLanguage(resolvedSearchParams.lang)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?lang=${lang}`)

  const studentId = user.email?.split('@')[0]
  if (!studentId) redirect(`/login?lang=${lang}`)

  const attempts = await prisma.attempt.findMany({
    where: {
      student: {
        studentId,
      },
    },
    include: {
      scenario: true,
      attemptSteps: {
        include: {
          scenarioStep: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const copy = {
    th: {
      back: 'กลับแดชบอร์ด',
      title: 'ประวัติการซ้อม',
      subtitle: 'ดูคะแนน คำตอบ และ feedback ของการซ้อมแต่ละครั้ง',
      empty: 'ยังไม่มีประวัติการซ้อม',
      attempt: 'ครั้งที่',
      totalScore: 'คะแนนรวม',
      open: 'เปิดแบบฝึก',
      submitted: 'ส่งเมื่อ',
      answer: 'คำตอบผู้เรียน',
      feedback: 'feedback',
      noAnswer: 'ยังไม่มีคำตอบ',
    },
    en: {
      back: 'Back to Dashboard',
      title: 'Practice History',
      subtitle: 'Review scores, responses, and feedback from each practice attempt.',
      empty: 'No practice history yet.',
      attempt: 'Attempt',
      totalScore: 'Total score',
      open: 'Open practice',
      submitted: 'Submitted',
      answer: 'Student response',
      feedback: 'Feedback',
      noAnswer: 'No answer submitted',
    },
  }[lang]

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href={`/dashboard?lang=${lang}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#F5821F] transition hover:text-[#D96F14]"
          >
            <span aria-hidden="true">←</span>
            {copy.back}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle lang={lang} pathname="/dashboard/history" />
            <LogoutButton lang={lang} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#F5821F]">
            ID: {studentId}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {copy.title}
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-700">
            {copy.subtitle}
          </p>
        </section>

        <section className="mt-6 space-y-5">
          {attempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-base font-semibold text-slate-700">
              {copy.empty}
            </div>
          ) : (
            attempts.map((attempt, attemptIndex) => {
              const sortedSteps = [...attempt.attemptSteps].sort(
                (a, b) => a.scenarioStep.order - b.scenarioStep.order
              )
              const earned = sortedSteps.reduce(
                (total, step) => total + (step.numericScore ?? 0),
                0
              )
              const max = sortedSteps.reduce(
                (total, step) =>
                  total + (step.maxScore ?? step.scenarioStep.maxScore ?? 0),
                0
              )

              return (
                <article
                  key={attempt.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-[#FFF4E8] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                    <div>
                      <p className="text-sm font-bold text-[#F5821F]">
                        {copy.attempt} {attempts.length - attemptIndex}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950">
                        {attempt.scenario.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {copy.submitted}: {formatDate(attempt.createdAt, lang)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-[#F5821F]/25 bg-white px-4 py-1.5 text-sm font-bold text-[#F5821F]">
                        {copy.totalScore}: {earned}/{max || '-'}
                      </span>
                      <Link
                        href={`/dashboard/scenario/${attempt.scenarioId}?attemptId=${attempt.id}&lang=${lang}`}
                        className="rounded-full bg-[#F5821F] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#D96F14]"
                      >
                        {copy.open}
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
                    {sortedSteps.map((step) => (
                      <div
                        key={step.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-950">
                            {step.scenarioStep.order}. {step.scenarioStep.title}
                          </h3>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                            {getScoreLabel(step.aiScore, lang)} · {step.numericScore ?? 0}/{step.maxScore ?? step.scenarioStep.maxScore}
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                          {copy.answer}
                        </p>
                        <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-800">
                          {step.answer || copy.noAnswer}
                        </p>
                        {step.aiReasoning ? (
                          <>
                            <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                              {copy.feedback}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-800">
                              {step.aiReasoning}
                            </p>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
