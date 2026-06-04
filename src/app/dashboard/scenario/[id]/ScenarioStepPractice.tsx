'use client'

import { useMemo, useState, useTransition } from 'react'
import { submitScenarioStepAnswer } from './actions'

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

function getScoreLabel(score: string | null) {
  if (score === 'correct') {
    return 'Complete'
  }

  if (score === 'partial') {
    return 'Needs improvement'
  }

  if (score === 'incorrect') {
    return 'Incomplete'
  }

  return 'Pending review'
}

function getFeedbackCardClass(score: string | null, status: string | undefined) {
  if (status === 'failed') {
    return 'border-red-200 bg-red-50'
  }

  if (score === 'correct') {
    return 'border-teal-200 bg-[#E8F4F1]'
  }

  return 'border-[#C8963C]/40 bg-[#FDF3E3]'
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

  const remainingAttempts = useMemo(() => {
    const usedAttempts = latestAttemptStep?.attemptCount ?? 0
    return Math.max(MAX_STEP_ATTEMPTS - usedAttempts, 0)
  }, [latestAttemptStep?.attemptCount])

  if (!step) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold text-slate-700">
          Step-by-step practice is not configured for this scenario yet.
        </p>
      </section>
    )
  }

  const isLocked = latestAttemptStep?.isLocked ?? false
  const isSubmitDisabled =
    isPending || isListening || isLocked || answer.trim().length === 0

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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8C1515]">
            Step-by-Step Practice
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Step {step.order}: {step.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            {step.prompt}
          </p>
        </div>

        <div className="w-fit rounded-full border border-[#C8963C]/40 bg-[#FDF3E3] px-3 py-1 text-sm font-semibold text-[#8C1515]">
          {latestAttemptStep?.attemptCount ?? 0}/{MAX_STEP_ATTEMPTS} attempts
        </div>
      </div>

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
            className="text-sm font-bold text-slate-900"
          >
            Your response
          </label>

          <textarea
            id="step-answer"
            name="answer"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value)
            }}
            maxLength={MAX_STEP_ANSWER_LENGTH}
            disabled={isLocked}
            rows={7}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-[#8C1515] focus:ring-4 focus:ring-[#8C1515]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="Type your answer in Thai or English. You can also use voice input if your browser supports it."
          />

          <div className="mt-2 flex flex-col justify-between gap-2 text-sm sm:flex-row sm:items-center">
            <p className="font-medium text-slate-600">
              {answer.length}/{MAX_STEP_ANSWER_LENGTH} characters
            </p>

            <p className="font-medium text-slate-600">
              Remaining attempts: {remainingAttempts}
            </p>
          </div>
        </div>

        {speechError ? (
          <div className="rounded-xl border border-[#C8963C]/40 bg-[#FDF3E3] px-4 py-3 text-sm leading-6 text-slate-800">
            {speechError}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={startThaiVoiceInput}
            disabled={isListening || isLocked}
            className="inline-flex items-center justify-center rounded-xl border border-[#8C1515]/20 bg-white px-5 py-3 text-sm font-bold text-[#8C1515] transition hover:bg-[#f8f6f3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isListening ? 'Listening...' : 'Use Thai Voice Input'}
          </button>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex items-center justify-center rounded-xl bg-[#8C1515] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#741111] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? 'Checking answer...'
              : isLocked
                ? 'Step completed'
                : 'Submit Step Answer'}
          </button>
        </div>
      </form>

      {latestAttemptStep ? (
        <div
          className={`mt-6 rounded-2xl border p-5 ${getFeedbackCardClass(
            latestAttemptStep.aiScore,
            latestAttemptStep.aiStatus
          )}`}
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8C1515]">
                Step Feedback
              </p>

              <h3 className="mt-2 text-lg font-bold text-slate-950">
                {getScoreLabel(latestAttemptStep.aiScore)}
              </h3>
            </div>

            {latestAttemptStep.isLocked ? (
              <span className="w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                Locked
              </span>
            ) : (
              <span className="w-fit rounded-full border border-[#C8963C]/40 bg-white px-3 py-1 text-xs font-bold text-[#8C1515]">
                Try again
              </span>
            )}
          </div>

          {latestAttemptStep.aiStatus === 'failed' ? (
            <p className="mt-4 text-sm leading-6 text-slate-800">
              The system could not complete the review for this attempt. Please
              try again with a clear answer.
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-800">
              {latestAttemptStep.aiReasoning ||
                'The system reviewed your response.'}
            </p>
          )}

          {latestAttemptStep.aiMissingElements.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-bold text-slate-900">
                Recommended improvements
              </p>

              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-800">
                {latestAttemptStep.aiMissingElements.map((element) => (
                  <li key={element} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8C1515]" />
                    <span>{element}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {latestAttemptStep.modelAnswerRevealed && step.modelAnswer ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-[#8C1515]">
                Model answer
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-800">
                {step.modelAnswer}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}