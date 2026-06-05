'use client'

import { useMemo, useState, useTransition } from 'react'
import { resetScenarioPractice, submitScenarioStepAnswer } from './actions'

const MAX_STEP_ANSWER_LENGTH = 2000
const MAX_STEP_ATTEMPTS = 3
const BACK_PAIN_SCENARIO_ID = 'back-pain-scenario-001'
const BACK_PAIN_IMAGE_PATH = '/scenarios/back-pain/back-pain-clinical-scene.png'

type ScenarioStepPracticeStep = {
  id: string
  order: number
  title: string
  prompt: string
  modelAnswer: string | null
}

type ScenarioStepPracticeResult = {
  answer: string | null
  aiScore: string | null
  aiReasoning: string | null
  aiMissingElements: string[]
  aiStatus: string
  attemptCount: number
  isLocked: boolean
  modelAnswerRevealed: boolean
} | null

type ScenarioStepPracticeProps = {
  scenarioId: string
  step: ScenarioStepPracticeStep | null
  latestAttemptStep: ScenarioStepPracticeResult
}

type SpeechRecognitionAlternative = {
  transcript: string
}

type SpeechRecognitionResult = {
  0: SpeechRecognitionAlternative
}

type SpeechRecognitionResultList = {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList
}

type SpeechRecognitionErrorEvent = {
  error: string
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

function LoadingSpinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  )
}

function getScoreLabel(score: string | null) {
  if (score === 'correct') return 'Complete'
  if (score === 'partial') return 'Review needed'
  if (score === 'incorrect') return 'Needs more practice'
  return 'Pending review'
}

function getScoreDescription(score: string | null) {
  if (score === 'correct') {
    return 'Your response includes the key nursing points for this step.'
  }

  if (score === 'partial') {
    return 'Your response is on the right track, but some important nursing points still need to be improved.'
  }

  if (score === 'incorrect') {
    return 'Please review the step question and include the missing clinical points before continuing.'
  }

  return 'The system is reviewing this step.'
}

function getMissingElementLabel(element: string) {
  const labels: Record<string, string> = {
    'pain location': 'ตำแหน่งที่ปวด / pain location',
    'pain severity': 'ระดับความปวด / pain severity',
    'pain onset': 'เวลาเริ่มปวด / pain onset',
    'pain duration': 'ระยะเวลาที่ปวด / pain duration',
  }

  return labels[element.trim().toLowerCase()] ?? element
}

function getFeedbackTheme(score: string | null, status: string | undefined) {
  if (status === 'failed') {
    return {
      card: 'border-red-300 bg-white',
      accent: 'bg-red-600',
      eyebrow: 'text-red-800',
      title: 'text-red-900',
      badge: 'border-red-300 bg-red-50 text-red-900',
      inner: 'border-red-200 bg-slate-50',
      missing: 'border-red-200 bg-white text-red-900',
      missingAccent: 'border-l-red-600',
    }
  }

  if (score === 'correct') {
    return {
      card: 'border-green-300 bg-white',
      accent: 'bg-green-600',
      eyebrow: 'text-green-800',
      title: 'text-green-900',
      badge: 'border-green-300 bg-green-50 text-green-900',
      inner: 'border-green-200 bg-slate-50',
      missing: 'border-green-200 bg-white text-green-900',
      missingAccent: 'border-l-green-600',
    }
  }

  if (score === 'partial') {
    return {
      card: 'border-slate-300 bg-white',
      accent: 'bg-[#A73535]',
      eyebrow: 'text-slate-700',
      title: 'text-slate-950',
      badge: 'border-slate-300 bg-slate-100 text-slate-900',
      inner: 'border-slate-200 bg-slate-50',
      missing: 'border-slate-200 bg-white text-slate-950',
      missingAccent: 'border-l-[#A73535]',
    }
  }

  if (score === 'incorrect') {
    return {
      card: 'border-red-300 bg-white',
      accent: 'bg-red-600',
      eyebrow: 'text-red-800',
      title: 'text-red-900',
      badge: 'border-red-300 bg-red-50 text-red-900',
      inner: 'border-red-200 bg-slate-50',
      missing: 'border-red-200 bg-white text-red-900',
      missingAccent: 'border-l-red-600',
    }
  }

  return {
    card: 'border-slate-300 bg-white',
    accent: 'bg-slate-700',
    eyebrow: 'text-slate-700',
    title: 'text-slate-950',
    badge: 'border-slate-300 bg-slate-100 text-slate-900',
    inner: 'border-slate-200 bg-slate-50',
    missing: 'border-slate-200 bg-white text-slate-900',
    missingAccent: 'border-l-slate-600',
  }
}

export default function ScenarioStepPractice({
  scenarioId,
  step,
  latestAttemptStep,
}: ScenarioStepPracticeProps) {
  const [answer, setAnswer] = useState(latestAttemptStep?.answer || '')
  const [speechError, setSpeechError] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isResetPending, startResetTransition] = useTransition()

  const usedAttempts = latestAttemptStep?.attemptCount ?? 0
  const remainingAttempts = useMemo(() => {
    return Math.max(MAX_STEP_ATTEMPTS - usedAttempts, 0)
  }, [usedAttempts])

  if (!step) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-base font-semibold text-slate-950">
          Step-by-step practice is not configured for this scenario yet.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          This scenario can still be completed using the final assessment form.
        </p>
      </section>
    )
  }

  const isBackPainScenario = scenarioId === BACK_PAIN_SCENARIO_ID
  const isLocked = latestAttemptStep?.isLocked ?? false
  const isFinalAttemptNext = remainingAttempts === 1 && !isLocked
  const isNeedsRetry =
    latestAttemptStep !== null &&
    !isLocked &&
    (latestAttemptStep.aiScore === 'partial' ||
      latestAttemptStep.aiScore === 'incorrect' ||
      latestAttemptStep.aiStatus === 'failed')

  const isSubmitDisabled =
    isPending ||
    isResetPending ||
    isListening ||
    isLocked ||
    answer.trim().length === 0

  const feedbackTheme = getFeedbackTheme(
    latestAttemptStep?.aiScore ?? null,
    latestAttemptStep?.aiStatus
  )

  function startThaiVoiceInput() {
    setSpeechError('')

    const speechWindow = window as WindowWithSpeechRecognition
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechError(
        'Voice input is not supported in this browser. Please type your answer instead.'
      )
      return
    }

    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.lang = 'th-TH'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setSpeechError(`Voice input stopped: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript || ''

      if (!transcript.trim()) {
        return
      }

      setAnswer((currentAnswer) => {
        const nextAnswer = currentAnswer
          ? `${currentAnswer.trim()} ${transcript.trim()}`
          : transcript.trim()

        return nextAnswer.slice(0, MAX_STEP_ANSWER_LENGTH)
      })
    }

    try {
      recognition.start()
    } catch {
      setSpeechError(
        'Voice input could not start. Please try again or type your answer.'
      )
      setIsListening(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#A73535]">
              Step-by-step practice
            </p>

            <h2 className="mt-3 text-2xl font-bold leading-8 text-slate-950 sm:text-3xl">
              Step {step.order}: {step.title}
            </h2>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-800">
              {step.prompt}
            </p>
          </div>

          <div className="flex w-fit flex-col gap-2 sm:items-end">
            {usedAttempts > 0 ? (
              <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900 shadow-sm">
                Attempt {usedAttempts}/{MAX_STEP_ATTEMPTS}
              </div>
            ) : (
              <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900 shadow-sm">
                No attempts yet
              </div>
            )}

            {isFinalAttemptNext ? (
              <div className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-bold text-red-900 shadow-sm">
                Final attempt next
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

                <button
                  type="submit"
                  disabled={isPending || isResetPending}
                  className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-[#A73535]/50 hover:bg-slate-50 hover:text-[#A73535] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetPending ? 'Restarting...' : 'Restart Practice'}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {isBackPainScenario ? (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex min-h-[280px] items-end justify-center bg-slate-100 px-6 pt-8">
                <img
                  src={BACK_PAIN_IMAGE_PATH}
                  alt="Illustrated older female patient seated during a lower back pain clinical scenario"
                  className="max-h-[340px] w-full max-w-[520px] object-contain"
                />
              </div>

              <div className="flex flex-col justify-center border-t border-slate-200 bg-white p-6 lg:border-l lg:border-t-0 sm:p-7">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#A73535]">
                  Clinical scene
                </p>

                <h3 className="mt-3 text-xl font-bold leading-7 text-slate-950">
                  Patient presentation for focused assessment
                </h3>

                <p className="mt-3 text-base leading-7 text-slate-800">
                  Use this scene as context for the current step. Focus on
                  asking clear assessment questions before giving nursing
                  advice.
                </p>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold leading-6 text-slate-700">
                    Demo note: privacy-safe illustrated clinical visual for the
                    Back Pain scenario.
                  </p>
                </div>
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

          <div>
            <label
              htmlFor="step-answer"
              className="text-lg font-bold text-slate-950"
            >
              Student response
            </label>

            <p className="mt-2 text-base leading-7 text-slate-800">
              Answer clearly in Thai or English. Focus on the key nursing
              assessment and care points for this step.
            </p>

            {isNeedsRetry ? (
              <div className="mt-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-900">
                Edit your answer in the box below, then submit again to improve
                this step.
              </div>
            ) : null}

            <div className="relative mt-3">
              <textarea
                id="step-answer"
                name="answer"
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value)
                }}
                maxLength={MAX_STEP_ANSWER_LENGTH}
                disabled={isLocked || isPending || isResetPending}
                rows={7}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#A73535] focus:ring-4 focus:ring-[#A73535]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700"
                placeholder="Type your clinical response here. You can also use Thai voice input if your browser supports it."
              />

              {isPending ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
                  <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                    Reviewing your response...
                  </div>
                </div>
              ) : null}

              {isResetPending ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
                  <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                    Restarting practice...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col justify-between gap-2 text-sm sm:flex-row sm:items-center">
              <p className="font-semibold text-slate-700">
                {answer.length}/{MAX_STEP_ANSWER_LENGTH} characters
              </p>

              <p
                className={`font-bold ${
                  remainingAttempts === 0
                    ? 'text-red-800'
                    : isFinalAttemptNext
                      ? 'text-red-800'
                      : 'text-slate-700'
                }`}
              >
                Remaining attempts: {remainingAttempts}
              </p>
            </div>
          </div>

          {speechError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
              {speechError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startThaiVoiceInput}
              disabled={isListening || isLocked || isPending || isResetPending}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#A73535]/40 hover:bg-slate-50 hover:text-[#A73535] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isListening ? 'Listening...' : 'Use Thai voice input'}
            </button>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#A73535] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8E2B2B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <LoadingSpinner />
                  Checking response...
                </>
              ) : isLocked ? (
                'Step locked'
              ) : latestAttemptStep ? (
                'Resubmit response'
              ) : (
                'Submit response'
              )}
            </button>
          </div>
        </form>

        {latestAttemptStep ? (
          <div className="mt-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-bold uppercase tracking-[0.12em] text-slate-700">
                Guidance from last attempt
              </div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div
              className={`overflow-hidden rounded-2xl border-2 shadow-sm ${feedbackTheme.card}`}
            >
              <div className={`h-2 w-full ${feedbackTheme.accent}`} />

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-3">
                  <p
                    className={`text-sm font-bold uppercase tracking-[0.12em] ${feedbackTheme.eyebrow}`}
                  >
                    Latest submission result
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <h3
                      className={`text-2xl font-bold ${feedbackTheme.title}`}
                    >
                      {getScoreLabel(latestAttemptStep.aiScore)}
                    </h3>

                    <span
                      className={`rounded-full border px-4 py-1.5 text-sm font-bold ${feedbackTheme.badge}`}
                    >
                      {latestAttemptStep.isLocked ? 'Locked' : 'Try again'}
                    </span>

                    <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900">
                      Attempt {latestAttemptStep.attemptCount} of{' '}
                      {MAX_STEP_ATTEMPTS} reviewed
                    </span>
                  </div>

                  <p className="text-base leading-7 text-slate-800">
                    {getScoreDescription(latestAttemptStep.aiScore)}
                  </p>
                </div>

                <div
                  className={`mt-5 rounded-xl border p-4 ${feedbackTheme.inner}`}
                >
                  <p className="text-sm font-bold text-slate-950">
                    Feedback summary
                  </p>

                  {latestAttemptStep.aiStatus === 'failed' ? (
                    <p className="mt-2 text-base leading-7 text-slate-800">
                      The system could not complete the review for this attempt.
                      Please try again with a clearer answer.
                    </p>
                  ) : (
                    <p className="mt-2 text-base leading-7 text-slate-800">
                      {latestAttemptStep.aiReasoning ||
                        'The system reviewed your response.'}
                    </p>
                  )}
                </div>

                {latestAttemptStep.aiMissingElements.length > 0 ? (
                  <div
                    className={`mt-5 rounded-xl border border-slate-200 border-l-4 bg-white p-4 ${feedbackTheme.missingAccent}`}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold text-slate-950">
                        Points to improve before the next attempt
                      </p>

                      <span
                        className={`text-sm font-bold ${feedbackTheme.title}`}
                      >
                        {latestAttemptStep.aiMissingElements.length} missing
                        point
                        {latestAttemptStep.aiMissingElements.length > 1
                          ? 's'
                          : ''}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {latestAttemptStep.aiMissingElements.map(
                        (element, index) => (
                          <div
                            key={`${element}-${index}`}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold ${feedbackTheme.missing}`}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold shadow-sm">
                              {index + 1}
                            </span>
                            <span>{getMissingElementLabel(element)}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                {latestAttemptStep.modelAnswerRevealed && step.modelAnswer ? (
                  <div className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">
                      Learning reference answer
                    </p>

                    <p className="mt-2 text-base leading-7 text-slate-900">
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