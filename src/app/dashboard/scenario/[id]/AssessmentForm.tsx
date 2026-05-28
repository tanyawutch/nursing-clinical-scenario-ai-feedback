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

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors ${
        pending
          ? 'cursor-not-allowed bg-slate-400'
          : 'bg-[#aa1e2d] hover:bg-[#8a1824]'
      }`}
    >
      {pending ? 'Submitting...' : 'Submit Assessment'}
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
  const [isRecordingInterventions, setIsRecordingInterventions] = useState(false)

  const stopRecordingState = (field: SpeechField) => {
    if (field === 'diagnosis') {
      setIsRecordingDiagnosis(false)
    }

    if (field === 'interventions') {
      setIsRecordingInterventions(false)
    }
  }

  const startRecording = (field: SpeechField) => {
    const speechWindow = window as WindowWithSpeechRecognition
    const SpeechRecognition = speechWindow.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Your browser does not support voice input. Please use Chrome.')
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
      stopRecordingState(field)
    }

    recognition.onend = () => {
      stopRecordingState(field)
    }

    recognition.start()
  }

  return (
    <form action={submitAssessment} className="space-y-6">
      <input type="hidden" name="scenarioId" value={scenarioId} />

      <div>
        <label
          htmlFor="primaryDiagnosis"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          1. What is your primary nursing diagnosis?
        </label>

        <div className="relative">
          <textarea
            id="primaryDiagnosis"
            name="primaryDiagnosis"
            rows={3}
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            placeholder="Type your diagnosis here or use voice input..."
            required
            className="block w-full resize-none rounded-md border border-slate-300 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition-all focus:border-[#aa1e2d] focus:ring-1 focus:ring-[#aa1e2d] sm:text-sm"
          />

          <button
            type="button"
            onClick={() => startRecording('diagnosis')}
            disabled={isRecordingDiagnosis || isRecordingInterventions}
            className={`absolute bottom-3 right-3 rounded-full p-2 transition-colors ${
              isRecordingDiagnosis
                ? 'animate-pulse bg-red-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50'
            }`}
            title="Start voice input for diagnosis"
          >
            🎤
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="interventions"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          2. Recommended immediate nursing interventions:
        </label>

        <div className="relative">
          <textarea
            id="interventions"
            name="interventions"
            rows={4}
            value={interventions}
            onChange={(event) => setInterventions(event.target.value)}
            placeholder="List your interventions step-by-step or use voice input..."
            required
            className="block w-full resize-none rounded-md border border-slate-300 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition-all focus:border-[#aa1e2d] focus:ring-1 focus:ring-[#aa1e2d] sm:text-sm"
          />

          <button
            type="button"
            onClick={() => startRecording('interventions')}
            disabled={isRecordingDiagnosis || isRecordingInterventions}
            className={`absolute bottom-3 right-3 rounded-full p-2 transition-colors ${
              isRecordingInterventions
                ? 'animate-pulse bg-red-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50'
            }`}
            title="Start voice input for interventions"
          >
            🎤
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <SubmitButton />
      </div>
    </form>
  )
}