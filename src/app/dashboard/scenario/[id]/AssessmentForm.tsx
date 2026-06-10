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

type AssessmentSpeechRecognitionResult = {
  0: SpeechRecognitionAlternative
}

type AssessmentSpeechRecognitionResultList = {
  length: number
  item(index: number): AssessmentSpeechRecognitionResult
  [index: number]: AssessmentSpeechRecognitionResult
}

type AssessmentSpeechRecognitionEvent = {
  results: AssessmentSpeechRecognitionResultList
}

type AssessmentSpeechRecognitionErrorEvent = {
  error: string
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: AssessmentSpeechRecognitionEvent) => void) | null
  onerror: ((event: AssessmentSpeechRecognitionErrorEvent) => void) | null
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

function MicrophoneIcon() {
  return (
    <svg
      className="h-5 w-5"
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
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#A73535] px-8 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#8F2C2C] focus:outline-none focus:ring-2 focus:ring-[#A73535] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
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

function getTranscriptFromSpeechResults(
  results: AssessmentSpeechRecognitionResultList
) {
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
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechError(
        'Voice input is not supported in this browser. Please use Chrome or type your response manually.'
      )
      return
    }

    const recognition =
      new SpeechRecognition() as unknown as SpeechRecognitionInstance

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

    recognition.onresult = (event: AssessmentSpeechRecognitionEvent) => {
      const transcript = getTranscriptFromSpeechResults(event.results)

      if (field === 'diagnosis') {
        setDiagnosis(transcript)
      }

      if (field === 'interventions') {
        setInterventions(transcript)
      }
    }

    recognition.onerror = (event: AssessmentSpeechRecognitionErrorEvent) => {
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
    <form action={submitAssessment} className="space-y-10">
      <input type="hidden" name="scenarioId" value={scenarioId} />

      <div className="space-y-8">
        {/* Field 1: Primary Diagnosis */}
        <div>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <label
                htmlFor="primaryDiagnosis"
                className="block text-lg font-bold text-slate-950"
              >
                1. What is your primary nursing diagnosis?
              </label>
              <p className="mt-2 text-base leading-7 text-slate-800">
                State the likely nursing problem based on the patient presentation.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900">
              Required
            </span>
          </div>

          <div className="relative">
            <textarea
              id="primaryDiagnosis"
              name="primaryDiagnosis"
              rows={5}
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              placeholder="Type your diagnosis here or use voice input..."
              required
              className="block w-full resize-none rounded-2xl border border-slate-300 bg-white px-5 py-4 pr-16 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#A73535] focus:ring-4 focus:ring-[#A73535]/10"
            />

            <button
              type="button"
              onClick={() => startRecording('diagnosis')}
              disabled={isRecording}
              className={`absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                isRecordingDiagnosis
                  ? 'animate-pulse border-[#A73535] bg-[#A73535] text-white shadow-md'
                  : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 hover:text-[#A73535] disabled:cursor-not-allowed disabled:opacity-50'
              }`}
              title="Start voice input for diagnosis"
              aria-label="Start voice input for diagnosis"
            >
              <MicrophoneIcon />
            </button>
          </div>

          {isRecordingDiagnosis ? (
            <p className="mt-3 text-sm font-bold text-[#A73535] animate-pulse">
              Listening for diagnosis response...
            </p>
          ) : null}
        </div>

        {/* Field 2: Interventions */}
        <div>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <label
                htmlFor="interventions"
                className="block text-lg font-bold text-slate-950"
              >
                2. Recommended immediate nursing interventions
              </label>
              <p className="mt-2 text-base leading-7 text-slate-800">
                List immediate nursing actions that should be taken for the patient.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900">
              Required
            </span>
          </div>

          <div className="relative">
            <textarea
              id="interventions"
              name="interventions"
              rows={6}
              value={interventions}
              onChange={(event) => setInterventions(event.target.value)}
              placeholder="List your interventions step-by-step or use voice input..."
              required
              className="block w-full resize-none rounded-2xl border border-slate-300 bg-white px-5 py-4 pr-16 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#A73535] focus:ring-4 focus:ring-[#A73535]/10"
            />

            <button
              type="button"
              onClick={() => startRecording('interventions')}
              disabled={isRecording}
              className={`absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                isRecordingInterventions
                  ? 'animate-pulse border-[#A73535] bg-[#A73535] text-white shadow-md'
                  : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 hover:text-[#A73535] disabled:cursor-not-allowed disabled:opacity-50'
              }`}
              title="Start voice input for interventions"
              aria-label="Start voice input for interventions"
            >
              <MicrophoneIcon />
            </button>
          </div>

          {isRecordingInterventions ? (
            <p className="mt-3 text-sm font-bold text-[#A73535] animate-pulse">
              Listening for intervention response...
            </p>
          ) : null}
        </div>
      </div>

      {/* Speech Error Banner */}
      {speechError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h3 className="text-sm font-bold text-red-800">Voice input notice</h3>
          <p className="mt-1 text-sm text-red-700">{speechError}</p>
        </div>
      ) : null}

      {/* Footer Area */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p className="text-base font-bold text-slate-950">AI Feedback Note</p>
        <p className="mt-2 text-base leading-7 text-slate-800">
          The system first checks key clinical concepts. If the answer needs
          deeper interpretation, AI semantic feedback is used to support
          learning.
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base leading-7 text-slate-800">
          Submit only after both fields are completed.
        </p>
        <SubmitButton />
      </div>
    </form>
  )
}