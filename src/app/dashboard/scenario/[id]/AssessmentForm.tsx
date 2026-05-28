'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitAssessment } from './actions'

type AssessmentFormProps = {
  scenarioId: string
}

type SpeechField = 'diagnosis' | 'interventions'

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
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

type WindowWithSpeechRecognition = Window & {
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

function MicrophoneIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 14.5a3 3 0 0 0 3-3v-5a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3M9 21h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8C1515] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#741111] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
    >
      {pending ? (
        <>
          <LoadingSpinner />
          Evaluating response...
        </>
      ) : (
        'Submit Assessment'
      )}
    </button>
  )
}

function getTranscriptFromSpeechResults(results: SpeechRecognitionResultList) {
  const transcripts: string[] = []

  for (let index = 0; index < results.length; index += 1) {
    transcripts.push(results[index][0].transcript)
  }

  return transcripts.join('')
}

export default function AssessmentForm({ scenarioId }: AssessmentFormProps) {
  const [diagnosis, setDiagnosis] = useState('')
  const [interventions, setInterventions] = useState('')
  const [isRecordingDiagnosis, setIsRecordingDiagnosis] = useState(false)
  const [isRecordingInterventions, setIsRecordingInterventions] =
    useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)

  const isRecording = isRecordingDiagnosis || isRecordingInterventions

  const stopRecordingState = (field: SpeechField) => {
    if (field === 'diagnosis') {
      setIsRecordingDiagnosis(false)
    }

    if (field === 'interventions') {
      setIsRecordingInterventions(false)
    }
  }

  const startRecording = (field: SpeechField) => {
    setSpeechError(null)

    const speechWindow = window as WindowWithSpeechRecognition
    const SpeechRecognition = speechWindow.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechError(
        'Voice input is not supported in this browser. Please use Chrome or type your response manually.'
      )
      return
    }

    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'th-TH'

    recognition.onstart = () => {
      if (field === 'diagnosis') {
        setIsRecordingDiagnosis(true)
      }

      if (field === 'interventions') {
        setIsRecordingInterventions(true)
      }
    }

    recognition.onresult = (event) => {
      const transcript = getTranscriptFromSpeechResults(event.results)

      if (field === 'diagnosis') {
        setDiagnosis(transcript)
      }

      if (field === 'interventions') {
        setInterventions(transcript)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)

      setSpeechError(
        'Voice input could not be completed. Please check microphone permission or type your response manually.'
      )

      stopRecordingState(field)
    }

    recognition.onend = () => {
      stopRecordingState(field)
    }

    try {
      recognition.start()
    } catch (error) {
      console.error('Speech recognition start error:', error)

      setSpeechError(
        'Voice input could not start. Please try again or type your response manually.'
      )

      stopRecordingState(field)
    }
  }

  return (
    <form
      action={submitAssessment}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <input type="hidden" name="scenarioId" value={scenarioId} />

      <div className="rounded-xl border border-[#C8963C]/30 bg-[#FDF3E3] px-4 py-3">
        <p className="text-sm font-semibold text-[#8C1515]">
          Student Response
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          Answer in Thai, English, or mixed Thai-English. Focus on the main
          nursing diagnosis and immediate nursing interventions for this
          patient.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="rounded-xl border border-slate-200 bg-[#f8f6f3] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <label
                htmlFor="primaryDiagnosis"
                className="block text-sm font-semibold text-slate-900"
              >
                1. What is your primary nursing diagnosis?
              </label>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                State the likely nursing problem based on the patient
                presentation.
              </p>
            </div>

            <span className="rounded-full border border-[#C8963C]/40 bg-white px-3 py-1 text-xs font-semibold text-[#8C1515]">
              Required
            </span>
          </div>

          <div className="relative">
            <textarea
              id="primaryDiagnosis"
              name="primaryDiagnosis"
              rows={4}
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              placeholder="Type your diagnosis here or use voice input..."
              required
              className="block w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#8C1515] focus:ring-2 focus:ring-[#8C1515]/15"
            />

            <button
              type="button"
              onClick={() => startRecording('diagnosis')}
              disabled={isRecording}
              className={`absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                isRecordingDiagnosis
                  ? 'animate-pulse border-[#8C1515] bg-[#8C1515] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#C8963C] hover:text-[#8C1515] disabled:cursor-not-allowed disabled:opacity-50'
              }`}
              title="Start voice input for diagnosis"
              aria-label="Start voice input for diagnosis"
            >
              <MicrophoneIcon />
            </button>
          </div>

          {isRecordingDiagnosis ? (
            <p className="mt-2 text-xs font-medium text-[#8C1515]">
              Listening for diagnosis response...
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-[#f8f6f3] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <label
                htmlFor="interventions"
                className="block text-sm font-semibold text-slate-900"
              >
                2. Recommended immediate nursing interventions
              </label>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                List immediate nursing actions that should be taken for the
                patient.
              </p>
            </div>

            <span className="rounded-full border border-[#C8963C]/40 bg-white px-3 py-1 text-xs font-semibold text-[#8C1515]">
              Required
            </span>
          </div>

          <div className="relative">
            <textarea
              id="interventions"
              name="interventions"
              rows={5}
              value={interventions}
              onChange={(event) => setInterventions(event.target.value)}
              placeholder="List your interventions step-by-step or use voice input..."
              required
              className="block w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#8C1515] focus:ring-2 focus:ring-[#8C1515]/15"
            />

            <button
              type="button"
              onClick={() => startRecording('interventions')}
              disabled={isRecording}
              className={`absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                isRecordingInterventions
                  ? 'animate-pulse border-[#8C1515] bg-[#8C1515] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#C8963C] hover:text-[#8C1515] disabled:cursor-not-allowed disabled:opacity-50'
              }`}
              title="Start voice input for interventions"
              aria-label="Start voice input for interventions"
            >
              <MicrophoneIcon />
            </button>
          </div>

          {isRecordingInterventions ? (
            <p className="mt-2 text-xs font-medium text-[#8C1515]">
              Listening for intervention response...
            </p>
          ) : null}
        </div>
      </div>

      {speechError ? (
        <div className="rounded-xl border border-amber-200 bg-[#FDF3E3] px-4 py-3 text-sm leading-6 text-amber-900">
          {speechError}
        </div>
      ) : null}

      <div className="rounded-xl border border-[#E8F4F1] bg-[#E8F4F1] px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">
          AI feedback note
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          The system will first check key clinical concepts. If the answer needs
          deeper interpretation, it will use AI semantic feedback.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Submit only after both fields are completed.
        </p>

        <SubmitButton />
      </div>
    </form>
  )
}