'use client'

import { useMemo, useState, useTransition } from 'react'
import { resetScenarioPractice, submitScenarioStepAnswer } from './actions'

const MAX_STEP_ANSWER_LENGTH = 2000
const MAX_STEP_ATTEMPTS = 3

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
  if (score === 'correct') {
    return 'Complete'
  }

  if (score === 'partial') {
    return 'Review needed'
  }

  if (score === 'incorrect') {
    return 'Needs more practice'
  }

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

function getFeedbackTheme(score: string | null, status: string | undefined) {
  if (status === 'failed') {
    return {
      card: 'border-[#DC2626] bg-[#FEF2F2]',
      accent: 'bg-[#DC2626]',
      eyebrow: 'text-[#991B1B]',
      title: 'text-[#991B1B]',
      badge: 'border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]',
      inner: 'border-[#FCA5A5] bg-white',
      missing: 'border-[#FCA5A5] bg-white text-[#991B1B]',
      missingAccent: 'border-l-[#DC2626]',
    }
  }

  if (score === 'correct') {
    return {
      card: 'border-[#16A34A] bg-[#F0FDF4]',
      accent: 'bg-[#16A34A]',
      eyebrow: 'text-[#166534]',
      title: 'text-[#166534]',
      badge: 'border-[#86EFAC] bg-[#DCFCE7] text-[#166534]',
      inner: 'border-[#BBF7D0] bg-white',
      missing: 'border-[#86EFAC] bg-[#DCFCE7] text-[#166534]',
      missingAccent: 'border-l-[#16A34A]',
    }
  }

  if (score === 'partial') {
    return {
      card: 'border-[#D97706] bg-[#FFFBEB]',
      accent: 'bg-[#D97706]',
      eyebrow: 'text-[#92400E]',
      title: 'text-[#92400E]',
      badge: 'border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]',
      inner: 'border-[#FCD34D] bg-white',
      missing: 'border-[#FBBF24] bg-[#FFFBEB] text-[#92400E]',
      missingAccent: 'border-l-[#D97706]',
    }
  }

  if (score === 'incorrect') {
    return {
      card: 'border-[#DC2626] bg-[#FEF2F2]',
      accent: 'bg-[#DC2626]',
      eyebrow: 'text-[#991B1B]',
      title: 'text-[#991B1B]',
      badge: 'border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]',
      inner: 'border-[#FCA5A5] bg-white',
      missing: 'border-[#FCA5A5] bg-white text-[#991B1B]',
      missingAccent: 'border-l-[#DC2626]',
    }
  }

  return {
    card: 'border-[#D6A84F] bg-[#FFFBEB]',
    accent: 'bg-[#D6A84F]',
    eyebrow: 'text-[#92400E]',
    title: 'text-[#92400E]',
    badge: 'border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]',
    inner: 'border-[#FCD34D] bg-white',
    missing: 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]',
    missingAccent: 'border-l-[#D6A84F]',
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
      <section className="rounded-2xl border border-dashed border-[#D7D0C7] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-base font-medium text-[#1F2937]">
          Step-by-step practice is not configured for this scenario yet.
        </p>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          This scenario can still be completed using the final assessment form.
        </p>
      </section>
    )
  }

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
    <section className="overflow-hidden rounded-2xl border border-[#E5E1DA] bg-white shadow-sm">
      <div className="border-b border-[#E5E1DA] bg-[#FBFAF8] px-6 py-5 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B7280]">
              Step-by-step practice
            </p>

            <h2 className="mt-2 text-xl font-semibold leading-8 text-[#111827] sm:text-2xl">
              Step {step.order}: {step.title}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#374151] sm:text-base sm:leading-7">
              {step.prompt}
            </p>
          </div>

          <div className="flex w-fit flex-col gap-2 sm:items-end">
            {usedAttempts > 0 ? (
              <div className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-4 py-1.5 text-sm font-semibold text-[#1D4ED8] shadow-sm">
                Attempt {usedAttempts}/{MAX_STEP_ATTEMPTS}
              </div>
            ) : (
              <div className="rounded-full border border-[#D7D0C7] bg-white px-4 py-1.5 text-sm font-medium text-[#4B5563]">
                No attempts yet
              </div>
            )}

            {isFinalAttemptNext ? (
              <div className="rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-1.5 text-sm font-semibold text-[#991B1B] shadow-sm">
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
                  className="mt-1 inline-flex items-center justify-center rounded-full border border-[#D7D0C7] bg-white px-4 py-1.5 text-sm font-medium text-[#374151] transition hover:border-[#8B1E16]/40 hover:bg-[#F7F4EF] hover:text-[#8B1E16] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetPending ? 'Restarting...' : 'Restart Practice'}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
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
              className="text-sm font-semibold text-[#111827]"
            >
              Student response
            </label>

            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              Answer clearly in Thai or English. Focus on the key nursing
              assessment and care points for this step.
            </p>

            {isNeedsRetry ? (
              <div className="mt-3 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm font-medium leading-6 text-[#92400E]">
                ← Edit your answer in the box below, then submit again to
                improve this step.
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
                className="w-full rounded-xl border border-[#D7D0C7] bg-white px-4 py-3 text-base leading-7 text-[#111827] outline-none transition placeholder:text-[#6B7280] focus:border-[#8B1E16] focus:ring-4 focus:ring-[#8B1E16]/10 disabled:cursor-not-allowed disabled:bg-[#F3F1ED] disabled:text-[#4B5563]"
                placeholder="Type your clinical response here. You can also use Thai voice input if your browser supports it."
              />

              {isPending ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
                  <div className="rounded-full border border-[#D7D0C7] bg-white px-4 py-2 text-sm font-medium text-[#374151] shadow-sm">
                    Reviewing your response...
                  </div>
                </div>
              ) : null}

              {isResetPending ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
                  <div className="rounded-full border border-[#D7D0C7] bg-white px-4 py-2 text-sm font-medium text-[#374151] shadow-sm">
                    Restarting practice...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col justify-between gap-2 text-sm sm:flex-row sm:items-center">
              <p className="font-normal text-[#4B5563]">
                {answer.length}/{MAX_STEP_ANSWER_LENGTH} characters
              </p>

              <p
                className={`font-semibold ${
                  remainingAttempts === 0
                    ? 'text-[#991B1B]'
                    : isFinalAttemptNext
                      ? 'text-[#92400E]'
                      : 'text-[#1D4ED8]'
                }`}
              >
                Remaining attempts: {remainingAttempts}
              </p>
            </div>
          </div>

          {speechError ? (
            <div className="rounded-xl border border-[#F3D19E] bg-[#FFF7ED] px-4 py-3 text-sm leading-6 text-[#1F2937]">
              {speechError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startThaiVoiceInput}
              disabled={isListening || isLocked || isPending || isResetPending}
              className="inline-flex items-center justify-center rounded-xl border border-[#D7D0C7] bg-white px-5 py-3 text-sm font-medium text-[#374151] transition hover:border-[#8B1E16]/30 hover:bg-[#F7F4EF] hover:text-[#8B1E16] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isListening ? 'Listening...' : 'Use Thai voice input'}
            </button>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E16] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#70170F] disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className="h-px flex-1 bg-[#D7D0C7]" />
              <div className="rounded-full border border-[#D7D0C7] bg-white px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                Guidance from last attempt
              </div>
              <div className="h-px flex-1 bg-[#D7D0C7]" />
            </div>

            <div
              className={`overflow-hidden rounded-2xl border-2 shadow-sm ${feedbackTheme.card}`}
            >
              <div className={`h-2 w-full ${feedbackTheme.accent}`} />

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-3">
                  <p
                    className={`text-sm font-semibold uppercase tracking-[0.18em] ${feedbackTheme.eyebrow}`}
                  >
                    Latest submission result
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <h3
                      className={`text-2xl font-semibold ${feedbackTheme.title}`}
                    >
                      {getScoreLabel(latestAttemptStep.aiScore)}
                    </h3>

                    <span
                      className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${feedbackTheme.badge}`}
                    >
                      {latestAttemptStep.isLocked ? 'Locked' : 'Try again'}
                    </span>

                    <span className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-4 py-1.5 text-sm font-semibold text-[#1D4ED8]">
                      Attempt {latestAttemptStep.attemptCount} of{' '}
                      {MAX_STEP_ATTEMPTS} reviewed
                    </span>
                  </div>

                  <p className="text-base leading-7 text-[#374151]">
                    {getScoreDescription(latestAttemptStep.aiScore)}
                  </p>
                </div>

                <div
                  className={`mt-5 rounded-xl border p-4 ${feedbackTheme.inner}`}
                >
                  <p className="text-sm font-semibold text-[#111827]">
                    Feedback summary
                  </p>

                  {latestAttemptStep.aiStatus === 'failed' ? (
                    <p className="mt-2 text-base leading-7 text-[#1F2937]">
                      The system could not complete the review for this attempt.
                      Please try again with a clearer answer.
                    </p>
                  ) : (
                    <p className="mt-2 text-base leading-7 text-[#1F2937]">
                      {latestAttemptStep.aiReasoning ||
                        'The system reviewed your response.'}
                    </p>
                  )}
                </div>

                {latestAttemptStep.aiMissingElements.length > 0 ? (
                  <div
                    className={`mt-5 rounded-xl border border-[#E5E7EB] border-l-4 bg-white p-4 ${feedbackTheme.missingAccent}`}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-[#111827]">
                        Points to improve before the next attempt
                      </p>

                      <span
                        className={`text-sm font-semibold ${feedbackTheme.title}`}
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
                            key={element}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium ${feedbackTheme.missing}`}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold shadow-sm">
                              {index + 1}
                            </span>
                            <span>{element}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                {latestAttemptStep.modelAnswerRevealed && step.modelAnswer ? (
                  <div className="mt-5 rounded-xl border border-[#B7DDD6] bg-[#E8F4F1] p-4">
                    <p className="text-sm font-semibold text-[#134E4A]">
                      Learning reference answer
                    </p>

                    <p className="mt-2 text-base leading-7 text-[#1F2937]">
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