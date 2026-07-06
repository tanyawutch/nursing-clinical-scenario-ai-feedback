'use client'

import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import { resetScenarioPractice, submitScenarioStepAnswer } from './actions'

const MAX_STEP_ANSWER_LENGTH = 4000
const MAX_STEP_ATTEMPTS = 2
const BACK_PAIN_SCENARIO_ID = 'back-pain-scenario-001'
const BACK_PAIN_IMAGE_PATH = '/scenarios/back-pain/back-pain-clinical-scene.png'

type PageLanguage = 'th' | 'en'

type FormField = {
  id: string
  labelTh: string
  labelEn: string
  placeholderTh: string
  placeholderEn: string
  rows?: number
}

type StepFormSchema = {
  instructionTh?: string
  instructionEn?: string
  fields?: FormField[]
}

type ScenarioStepPracticeStep = {
  id: string
  order: number
  title: string
  prompt: string
  modelAnswer: string | null
  maxScore: number
  passScore: number
  formSchema: unknown
}

type ScenarioStepPracticeResult = {
  answer: string | null
  aiScore: string | null
  aiReasoning: string | null
  aiMissingElements: string[]
  aiStatus: string
  numericScore: number | null
  maxScore: number | null
  matchedElements: string[]
  evaluationDetails: unknown
  attemptCount: number
  isLocked: boolean
  modelAnswerRevealed: boolean
} | null

type ScenarioStepPracticeProps = {
  lang: PageLanguage
  scenarioId: string
  step: ScenarioStepPracticeStep | null
  latestAttemptStep: ScenarioStepPracticeResult
}

function isFormSchema(value: unknown): value is StepFormSchema {
  if (!value || typeof value !== 'object') {
    return false
  }

  const schema = value as StepFormSchema

  return schema.fields === undefined || Array.isArray(schema.fields)
}

function getFields(schema: unknown) {
  if (!isFormSchema(schema) || !schema.fields) {
    return []
  }

  return schema.fields.filter((field): field is FormField => {
    return (
      typeof field.id === 'string' &&
      typeof field.labelTh === 'string' &&
      typeof field.labelEn === 'string' &&
      typeof field.placeholderTh === 'string' &&
      typeof field.placeholderEn === 'string'
    )
  })
}

function getInstruction(schema: unknown, lang: PageLanguage) {
  if (!isFormSchema(schema)) {
    return ''
  }

  return lang === 'th'
    ? schema.instructionTh || ''
    : schema.instructionEn || schema.instructionTh || ''
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

function LoadingSpinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  )
}

function buildCombinedAnswer(
  fields: FormField[],
  values: Record<string, string>,
  lang: PageLanguage
) {
  if (fields.length === 0) {
    return values.freeText?.trim() || ''
  }

  return fields
    .filter((field) => values[field.id]?.trim())
    .map((field) => {
      const label = lang === 'th' ? field.labelTh : field.labelEn
      return `${label}:\n${values[field.id].trim()}`
    })
    .join('\n\n')
    .trim()
}

export default function ScenarioStepPractice({
  lang,
  scenarioId,
  step,
  latestAttemptStep,
}: ScenarioStepPracticeProps) {
  const [isPending, startTransition] = useTransition()
  const [isResetPending, startResetTransition] = useTransition()
  const fields = useMemo(() => getFields(step?.formSchema), [step?.formSchema])
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (fields.length === 0) {
      return { freeText: latestAttemptStep?.answer || '' }
    }

    return Object.fromEntries(fields.map((field) => [field.id, '']))
  })

  const copy = {
    th: {
      noStep: 'ยังไม่ได้ตั้งค่าแบบฝึกสำหรับสถานการณ์นี้',
      practice: 'แบบฝึกตาม rubric',
      attempt: 'ครั้งที่',
      noAttempts: 'ยังไม่ได้ส่งคำตอบ',
      finalAttempt: 'ส่งได้อีกครั้งสุดท้าย',
      restart: 'เริ่มทำใหม่',
      restarting: 'กำลังเริ่มใหม่...',
      answer: 'คำตอบของนักศึกษา',
      answerHelp:
        'กรอกคำตอบเป็นภาษาไทยเป็นหลัก สามารถใช้คำศัพท์อังกฤษทางคลินิกได้',
      remaining: 'จำนวนครั้งที่เหลือ',
      submit: 'ส่งคำตอบ',
      resubmit: 'ส่งคำตอบอีกครั้ง',
      checking: 'กำลังตรวจคำตอบ...',
      locked: 'ข้อนี้ถูกล็อกแล้ว',
      feedback: 'ผลตรวจครั้งล่าสุด',
      summary: 'สรุป feedback',
      missing: 'ประเด็นที่ควรเพิ่ม',
      matched: 'ประเด็นที่ตรวจพบ',
      modelAnswer: 'เฉลยอ้างอิง',
      score: 'คะแนน',
      passScore: 'เกณฑ์ผ่าน',
      clinicalScene: 'ภาพประกอบสถานการณ์',
      clinicalSceneText:
        'ใช้ข้อมูลผู้ป่วยและภาพประกอบนี้เป็นบริบทในการตอบตาม rubric',
      freePlaceholder: 'พิมพ์คำตอบของคุณที่นี่',
    },
    en: {
      noStep: 'Step-by-step practice is not configured for this scenario.',
      practice: 'Rubric practice',
      attempt: 'Attempt',
      noAttempts: 'No attempts yet',
      finalAttempt: 'Final attempt next',
      restart: 'Restart practice',
      restarting: 'Restarting...',
      answer: 'Student response',
      answerHelp:
        'Thai is the primary language, but clinical English terms are supported.',
      remaining: 'Remaining attempts',
      submit: 'Submit response',
      resubmit: 'Resubmit response',
      checking: 'Checking response...',
      locked: 'Step locked',
      feedback: 'Latest submission result',
      summary: 'Feedback summary',
      missing: 'Points to improve',
      matched: 'Matched concepts',
      modelAnswer: 'Reference answer',
      score: 'Score',
      passScore: 'Pass score',
      clinicalScene: 'Clinical scene',
      clinicalSceneText:
        'Use this patient information and scene as context for the rubric task.',
      freePlaceholder: 'Type your answer here',
    },
  }[lang]

  if (!step) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-base font-semibold text-slate-950">
          {copy.noStep}
        </p>
      </section>
    )
  }

  const usedAttempts = latestAttemptStep?.attemptCount ?? 0
  const remainingAttempts = Math.max(MAX_STEP_ATTEMPTS - usedAttempts, 0)
  const isLocked = latestAttemptStep?.isLocked ?? false
  const isFinalAttemptNext = remainingAttempts === 1 && !isLocked
  const combinedAnswer = buildCombinedAnswer(fields, answers, lang)
  const isSubmitDisabled =
    isPending ||
    isResetPending ||
    isLocked ||
    combinedAnswer.trim().length === 0 ||
    combinedAnswer.length > MAX_STEP_ANSWER_LENGTH
  const displayedScore = latestAttemptStep?.numericScore ?? 0
  const displayedMaxScore = latestAttemptStep?.maxScore ?? step.maxScore

  function updateAnswer(fieldId: string, value: string) {
    setAnswers((current) => ({
      ...current,
      [fieldId]: value.slice(0, MAX_STEP_ANSWER_LENGTH),
    }))
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#A73535]">
              {copy.practice}
            </p>

            <h2 className="mt-3 text-2xl font-bold leading-8 text-slate-950 sm:text-3xl">
              {lang === 'th' ? `งานที่ ${step.order}: ` : `Task ${step.order}: `}
              {step.title}
            </h2>

            <p className="mt-3 max-w-4xl text-base leading-7 text-slate-800">
              {step.prompt}
            </p>

            {getInstruction(step.formSchema, lang) ? (
              <p className="mt-3 max-w-4xl rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-950">
                {getInstruction(step.formSchema, lang)}
              </p>
            ) : null}
          </div>

          <div className="flex w-fit flex-col gap-2 lg:items-end">
            <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900 shadow-sm">
              {usedAttempts > 0
                ? `${copy.attempt} ${usedAttempts}/${MAX_STEP_ATTEMPTS}`
                : copy.noAttempts}
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-bold text-slate-800">
              {copy.passScore}: {step.passScore}/{step.maxScore}
            </div>

            {isFinalAttemptNext ? (
              <div className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-bold text-red-900 shadow-sm">
                {copy.finalAttempt}
              </div>
            ) : null}

            {latestAttemptStep ? (
              <form
                action={(formData) => {
                  startResetTransition(() => {
                    resetScenarioPractice(formData)
                  })
                }}
              >
                <input type="hidden" name="scenarioId" value={scenarioId} />
                <input type="hidden" name="lang" value={lang} />
                <button
                  type="submit"
                  disabled={isPending || isResetPending}
                  className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-[#A73535]/50 hover:bg-slate-50 hover:text-[#A73535] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetPending ? copy.restarting : copy.restart}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {scenarioId === BACK_PAIN_SCENARIO_ID ? (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex min-h-[280px] items-end justify-center bg-slate-100 px-6 pt-8">
                <Image
                  src={BACK_PAIN_IMAGE_PATH}
                  alt="Back pain clinical scenario"
                  width={520}
                  height={340}
                  className="max-h-[340px] w-full max-w-[520px] object-contain"
                  priority
                />
              </div>

              <div className="flex flex-col justify-center border-t border-slate-200 bg-white p-6 sm:p-7 lg:border-l lg:border-t-0">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#A73535]">
                  {copy.clinicalScene}
                </p>

                <h3 className="mt-3 text-xl font-bold leading-7 text-slate-950">
                  {lang === 'th'
                    ? 'ผู้ป่วยหญิงอายุ 55 ปี มีอาการปวดหลังใน OPD'
                    : '55-year-old female patient with back pain in OPD'}
                </h3>

                <p className="mt-3 text-base leading-7 text-slate-800">
                  {copy.clinicalSceneText}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form
          action={(formData) => {
            startTransition(() => {
              submitScenarioStepAnswer(formData)
            })
          }}
          className="space-y-5"
        >
          <input type="hidden" name="scenarioId" value={scenarioId} />
          <input type="hidden" name="scenarioStepId" value={step.id} />
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="answer" value={combinedAnswer} />

          <div>
            <h3 className="text-lg font-bold text-slate-950">
              {copy.answer}
            </h3>

            <p className="mt-2 text-base leading-7 text-slate-800">
              {copy.answerHelp}
            </p>

            <div className="mt-4 grid gap-4">
              {fields.length > 0 ? (
                fields.map((field) => (
                  <label key={field.id} className="block">
                    <span className="text-sm font-bold text-slate-900">
                      {lang === 'th' ? field.labelTh : field.labelEn}
                    </span>
                    <textarea
                      value={answers[field.id] ?? ''}
                      onChange={(event) => {
                        updateAnswer(field.id, event.target.value)
                      }}
                      disabled={isLocked || isPending || isResetPending}
                      rows={field.rows ?? 4}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#A73535] focus:ring-4 focus:ring-[#A73535]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700"
                      placeholder={
                        lang === 'th'
                          ? field.placeholderTh
                          : field.placeholderEn
                      }
                    />
                  </label>
                ))
              ) : (
                <textarea
                  value={answers.freeText ?? ''}
                  onChange={(event) => {
                    updateAnswer('freeText', event.target.value)
                  }}
                  disabled={isLocked || isPending || isResetPending}
                  rows={8}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#A73535] focus:ring-4 focus:ring-[#A73535]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700"
                  placeholder={copy.freePlaceholder}
                />
              )}
            </div>

            <div className="mt-3 flex flex-col justify-between gap-2 text-sm sm:flex-row sm:items-center">
              <p className="font-semibold text-slate-700">
                {combinedAnswer.length}/{MAX_STEP_ANSWER_LENGTH}
              </p>

              <p
                className={`font-bold ${
                  remainingAttempts === 0 || isFinalAttemptNext
                    ? 'text-red-800'
                    : 'text-slate-700'
                }`}
              >
                {copy.remaining}: {remainingAttempts}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#A73535] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8E2B2B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <LoadingSpinner />
                {copy.checking}
              </>
            ) : isLocked ? (
              copy.locked
            ) : latestAttemptStep ? (
              copy.resubmit
            ) : (
              copy.submit
            )}
          </button>
        </form>

        {latestAttemptStep ? (
          <div className="mt-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-bold uppercase tracking-[0.12em] text-slate-700">
                {copy.feedback}
              </div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
              <div
                className={`h-2 w-full ${
                  latestAttemptStep.aiScore === 'correct'
                    ? 'bg-green-600'
                    : latestAttemptStep.aiScore === 'incorrect'
                      ? 'bg-red-600'
                      : 'bg-[#A73535]'
                }`}
              />

              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold text-slate-950">
                    {getScoreLabel(latestAttemptStep.aiScore, lang)}
                  </h3>

                  <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900">
                    {copy.score}: {displayedScore}/{displayedMaxScore}
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-bold text-slate-700">
                    {copy.passScore}: {step.passScore}/{step.maxScore}
                  </span>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-950">
                    {copy.summary}
                  </p>
                  <p className="mt-2 text-base leading-7 text-slate-800">
                    {latestAttemptStep.aiStatus === 'failed'
                      ? lang === 'th'
                        ? 'ระบบไม่สามารถตรวจคำตอบได้ กรุณาลองใหม่'
                        : 'The system could not complete the review.'
                      : latestAttemptStep.aiReasoning ||
                        (lang === 'th'
                          ? 'ระบบตรวจคำตอบแล้ว'
                          : 'The system reviewed your response.')}
                  </p>
                </div>

                {latestAttemptStep.matchedElements.length > 0 ? (
                  <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-bold text-green-950">
                      {copy.matched}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {latestAttemptStep.matchedElements.map((element) => (
                        <span
                          key={element}
                          className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-bold text-green-900"
                        >
                          {element}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {latestAttemptStep.aiMissingElements.length > 0 ? (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-bold text-red-950">
                      {copy.missing}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {latestAttemptStep.aiMissingElements.map(
                        (element, index) => (
                          <div
                            key={`${element}-${index}`}
                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-950"
                          >
                            {index + 1}. {element}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                {latestAttemptStep.modelAnswerRevealed && step.modelAnswer ? (
                  <div className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">
                      {copy.modelAnswer}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-base leading-7 text-slate-900">
                      {step.modelAnswer}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
