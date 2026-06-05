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
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B1E16] px-6 py-3.5 text-base font-medium text-white shadow-sm transition hover:bg-[#70170F] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
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
    <form
      action={submitAssessment}
      className="space-y-7 rounded-2xl border border-[#DED8CF] bg-white p-6 shadow-sm sm:p-8"
    >
      <input type="hidden" name="scenarioId" value={scenarioId} />

      <div className="rounded-2xl border border-[#E6C98F] bg-[#F7EAD2] px-5 py-4">
        <p className="text-base font-semibold text-[#8B1E16]">
          Student Response
        </p>
        <p className="mt-2 text-base leading-7 text-[#1F2937]">
          Answer in Thai, English, or mixed Thai-English. Focus on the main
          nursing diagnosis and immediate nursing interventions for this
          patient.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-2xl border border-[#DED8CF] bg-[#FAF9F7] p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <label
                htmlFor="primaryDiagnosis"
                className="block text-base font-semibold text-[#111827]"
              >
                1. What is your primary nursing diagnosis?
              </label>
              <p className="mt-2 text-base leading-7 text-[#1F2937]">
                State the likely nursing problem based on the patient
                presentation.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full border border-[#D6A84F]/50 bg-white px-4 py-1.5 text-sm font-medium text-[#8B1E16]">
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
              className="block w-full resize-none rounded-2xl border border-[#D7D0C7] bg-white px-5 py-4 pr-16 text-base leading-7 text-[#111827] outline-none transition placeholder:text-[#6B7280] focus:border-[#8B1E16] focus:ring-4 focus:ring-[#8B1E16]/10"
            />

            <button
              type="button"
              onClick={() => startRecording('diagnosis')}
              disabled={isRecording}
              className={`absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                isRecordingDiagnosis
                  ? 'animate-pulse border-[#8B1E16] bg-[#8B1E16] text-white'
                  : 'border-[#D7D0C7] bg-white text-[#4B5563] hover:border-[#D6A84F] hover:text-[#8B1E16] disabled:cursor-not-allowed disabled:opacity-50'
              }`}
              title="Start voice input for diagnosis"
              aria-label="Start voice input for diagnosis"
            >
              <MicrophoneIcon />
            </button>
          </div>

          {isRecordingDiagnosis ? (
            <p className="mt-3 text-sm font-medium text-[#8B1E16]">
              Listening for diagnosis response...
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[#DED8CF] bg-[#FAF9F7] p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <label
                htmlFor="interventions"
                className="block text-base font-semibold text-[#111827]"
              >
                2. Recommended immediate nursing interventions
              </label>
              <p className="mt-2 text-base leading-7 text-[#1F2937]">
                List immediate nursing actions that should be taken for the
                patient.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full border border-[#D6A84F]/50 bg-white px-4 py-1.5 text-sm font-medium text-[#8B1E16]">
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
              className="block w-full resize-none rounded-2xl border border-[#D7D0C7] bg-white px-5 py-4 pr-16 text-base leading-7 text-[#111827] outline-none transition placeholder:text-[#6B7280] focus:border-[#8B1E16] focus:ring-4 focus:ring-[#8B1E16]/10"
            />

            <button
              type="button"
              onClick={() => startRecording('interventions')}
              disabled={isRecording}
              className={`absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                isRecordingInterventions
                  ? 'animate-pulse border-[#8B1E16] bg-[#8B1E16] text-white'
                  : 'border-[#D7D0C7] bg-white text-[#4B5563] hover:border-[#D6A84F] hover:text-[#8B1E16] disabled:cursor-not-allowed disabled:opacity-50'
              }`}
              title="Start voice input for interventions"
              aria-label="Start voice input for interventions"
            >
              <MicrophoneIcon />
            </button>
          </div>

          {isRecordingInterventions ? (
            <p className="mt-3 text-sm font-medium text-[#8B1E16]">
              Listening for intervention response...
            </p>
          ) : null}
        </div>
      </div>

      {speechError ? (
        <div className="rounded-2xl border border-[#F3D19E] bg-[#FFF7ED] px-5 py-4 text-base leading-7 text-[#1F2937]">
          {speechError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#B7DDD6] bg-[#E8F4F1] px-5 py-4">
        <p className="text-base font-semibold text-[#111827]">
          AI feedback note
        </p>
        <p className="mt-2 text-base leading-7 text-[#1F2937]">
          The system will first check key clinical concepts. If the answer needs
          deeper interpretation, it will use AI semantic feedback.
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t border-[#DED8CF] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base leading-7 text-[#1F2937]">
          Submit only after both fields are completed.
        </p>

        <SubmitButton />
      </div>
    </form>
  )
}