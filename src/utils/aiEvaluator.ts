// src/utils/aiEvaluator.ts

type EvaluationScore = 'correct' | 'partial' | 'incorrect'

type GeminiEvaluationResult = {
  score: EvaluationScore
  reasoning: string
  missing_elements: string[]
}

type GeminiModel = {
  name?: string
  supportedGenerationMethods?: string[]
}

type GeminiModelListResponse = {
  models?: GeminiModel[]
}

type GeminiErrorDetail = {
  '@type'?: string
  retryDelay?: string
}

type GeminiErrorResponse = {
  error?: {
    details?: GeminiErrorDetail[]
  }
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

const CLINICAL_EVALUATOR_SYSTEM_PROMPT = `
You are a clinical nursing education evaluator for Thai nursing students.
Evaluate the student's response against the provided clinical rubric.
The student may write in Thai, English, or a mix of both.

Strict scoring rules:
- correct: ALL required rubric elements are present and clinically appropriate.
- partial: SOME required rubric elements are present, but one or more required elements are missing.
- incorrect: MOST required elements are missing, the diagnosis is wrong, or the response is clinically inappropriate.

Important:
- Do NOT mark the response as correct if any required element is missing.
- If missing_elements is not empty, the score must be "partial" or "incorrect", not "correct".
- Do NOT introduce medical dosages, treatments, or clinical information not present in the rubric provided.
- Return only valid JSON that matches the required schema.
`

function isGeminiModel(value: unknown): value is GeminiModel {
  if (!value || typeof value !== 'object') {
    return false
  }

  const model = value as GeminiModel

  return (
    typeof model.name === 'string' ||
    Array.isArray(model.supportedGenerationMethods)
  )
}

function isGeminiModelListResponse(
  value: unknown
): value is GeminiModelListResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const response = value as GeminiModelListResponse

  return (
    response.models === undefined ||
    (Array.isArray(response.models) && response.models.every(isGeminiModel))
  )
}

function isGeminiEvaluationResult(
  value: unknown
): value is GeminiEvaluationResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const result = value as GeminiEvaluationResult

  return (
    (result.score === 'correct' ||
      result.score === 'partial' ||
      result.score === 'incorrect') &&
    typeof result.reasoning === 'string' &&
    Array.isArray(result.missing_elements) &&
    result.missing_elements.every((item) => typeof item === 'string')
  )
}

async function getAvailableGeminiModel(apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  )

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('--- GEMINI MODEL LIST ERROR ---', response.status, errorBody)
    throw new Error(`Failed to list Gemini models: ${response.status}`)
  }

  const data: unknown = await response.json()

  if (!isGeminiModelListResponse(data)) {
    console.error('--- INVALID GEMINI MODEL LIST RESPONSE ---', data)
    throw new Error('Gemini returned an invalid model list response.')
  }

  const models = data.models ?? []

  const generativeModels = models.filter((model) =>
    model.supportedGenerationMethods?.includes('generateContent')
  )

  console.log(
    '--- AVAILABLE GENERATIVE GEMINI MODELS ---',
    generativeModels.map((model) => model.name)
  )

  const preferredModels = [
    'models/gemini-3.1-flash-lite',
    'models/gemini-2.5-flash-lite',
    'models/gemini-3-flash',
    'models/gemini-3.5-flash',
    'models/gemini-2.5-flash',
  ]

  const selectedModel =
    preferredModels.find((preferredModel) =>
      generativeModels.some((model) => model.name === preferredModel)
    ) ?? generativeModels.find((model) => model.name?.includes('gemini'))?.name

  if (!selectedModel) {
    console.error(
      '--- AVAILABLE GEMINI MODELS ---',
      JSON.stringify(models, null, 2)
    )
    throw new Error('No Gemini model supporting generateContent was found.')
  }

  console.log('--- SELECTED GEMINI MODEL ---', selectedModel)

  return selectedModel
}

function extractRetryDelay(errorBody: string): string | null {
  try {
    const parsed = JSON.parse(errorBody) as GeminiErrorResponse
    const details = parsed.error?.details ?? []

    const retryInfo = details.find((detail) =>
      detail['@type']?.includes('RetryInfo')
    )

    return retryInfo?.retryDelay ?? null
  } catch {
    return null
  }
}

function validateGeminiEvaluationResult(
  parsedResult: GeminiEvaluationResult
): GeminiEvaluationResult {
  if (
    parsedResult.score === 'correct' &&
    parsedResult.missing_elements.length > 0
  ) {
    return {
      ...parsedResult,
      score: 'partial',
      reasoning: `${parsedResult.reasoning} Scoring corrected to partial because required elements are still missing.`,
    }
  }

  return parsedResult
}

export async function evaluateWithGemini(
  studentResponse: string,
  rubricContext: string
): Promise<GeminiEvaluationResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    throw new Error('Google AI API Key is missing in .env')
  }

  const modelName = await getAvailableGeminiModel(apiKey)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: CLINICAL_EVALUATOR_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `
Clinical Rubric:
${rubricContext}

Student Response:
${studentResponse}

Return JSON only in this exact structure:
{
  "score": "correct" | "partial" | "incorrect",
  "reasoning": "brief explanation based only on the rubric",
  "missing_elements": ["list of missing required elements"]
}
`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              score: {
                type: 'STRING',
                enum: ['correct', 'partial', 'incorrect'],
              },
              reasoning: {
                type: 'STRING',
              },
              missing_elements: {
                type: 'ARRAY',
                items: {
                  type: 'STRING',
                },
              },
            },
            required: ['score', 'reasoning', 'missing_elements'],
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()

    console.error('--- GEMINI HTTP ERROR ---', response.status, errorBody)

    if (response.status === 429) {
      const retryDelay = extractRetryDelay(errorBody)

      throw new Error(
        retryDelay
          ? `Gemini quota exceeded. Please retry after ${retryDelay}.`
          : 'Gemini quota exceeded. Please try again later.'
      )
    }

    if (response.status === 404) {
      throw new Error(`Gemini model not found or not supported: ${modelName}`)
    }

    throw new Error(
      `Gemini API Error: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as GeminiGenerateContentResponse
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    console.error('--- EMPTY GEMINI RESPONSE ---', JSON.stringify(data, null, 2))
    throw new Error('Gemini returned no text response.')
  }

  try {
    const parsedResult: unknown = JSON.parse(rawText)

    if (!isGeminiEvaluationResult(parsedResult)) {
      console.error('--- INVALID GEMINI RESULT SHAPE ---', rawText)
      throw new Error('Gemini returned an invalid evaluation result shape.')
    }

    return validateGeminiEvaluationResult(parsedResult)
  } catch (error) {
    console.error('--- INVALID GEMINI JSON ---', rawText)
    throw error
  }
}