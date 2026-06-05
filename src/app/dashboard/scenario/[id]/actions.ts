'use server'

import { createClient } from '@/utils/supabase/server'
import prisma from '@/utils/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { evaluateWithGemini } from '@/utils/aiEvaluator'
import {
  evaluateWithRuleBasedLayer,
  type KeywordGroup,
} from '@/utils/ruleBasedEvaluator'

const MAX_STEP_ATTEMPTS = 3
const MAX_STEP_ANSWER_LENGTH = 2000

function parseKeywordGroups(value: unknown): KeywordGroup[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const groups = value
    .map((group) => {
      if (
        !group ||
        typeof group !== 'object' ||
        !('label' in group) ||
        !('keywords' in group)
      ) {
        return null
      }

      const label = (group as { label: unknown }).label
      const keywords = (group as { keywords: unknown }).keywords

      if (typeof label !== 'string' || !Array.isArray(keywords)) {
        return null
      }

      const cleanKeywords = keywords.filter(
        (keyword): keyword is string => typeof keyword === 'string'
      )

      return {
        label,
        keywords: cleanKeywords,
      }
    })
    .filter((group): group is KeywordGroup => group !== null)

  return groups.length > 0 ? groups : null
}

function formatKeywordGroupsForRubric(groups: KeywordGroup[] | null) {
  if (!groups || groups.length === 0) {
    return 'No keyword groups configured.'
  }

  return groups
    .map((group) => `- ${group.label}: ${group.keywords.join(', ')}`)
    .join('\n')
}

function buildRubricContext({
  scenarioTitle,
  scenarioDescription,
  rubric,
  requiredKeywords,
  optionalKeywords,
  requiredKeywordGroups,
  optionalKeywordGroups,
  modelAnswer,
}: {
  scenarioTitle: string
  scenarioDescription: string
  rubric: string | null
  requiredKeywords: string[]
  optionalKeywords: string[]
  requiredKeywordGroups: KeywordGroup[] | null
  optionalKeywordGroups: KeywordGroup[] | null
  modelAnswer: string | null
}) {
  const baseRubric = rubric?.trim()
    ? rubric.trim()
    : 'No written rubric configured.'

  return `
Scenario Title:
${scenarioTitle}

Scenario Description:
${scenarioDescription}

Rubric:
${baseRubric}

Required Keywords:
${requiredKeywords.length > 0 ? requiredKeywords.join(', ') : 'No required keywords configured.'}

Optional Keywords:
${optionalKeywords.length > 0 ? optionalKeywords.join(', ') : 'No optional keywords configured.'}

Required Keyword Groups:
${formatKeywordGroupsForRubric(requiredKeywordGroups)}

Optional Keyword Groups:
${formatKeywordGroupsForRubric(optionalKeywordGroups)}

Model Answer:
${modelAnswer?.trim() || 'No model answer configured.'}

Evaluation Instruction:
Evaluate the student's response based only on the scenario description, rubric, required keywords, optional keywords, keyword groups, and model answer above.
The student may answer in Thai, English, or mixed Thai-English.
If the required clinical meaning is present using equivalent Thai or English wording, count it as present.
Do not introduce medical information that is not provided here.
`
}

function buildStepRubricContext({
  scenarioTitle,
  scenarioDescription,
  stepTitle,
  stepPrompt,
  stepRubric,
  requiredKeywords,
  optionalKeywords,
  requiredKeywordGroups,
  optionalKeywordGroups,
  modelAnswer,
}: {
  scenarioTitle: string
  scenarioDescription: string
  stepTitle: string
  stepPrompt: string
  stepRubric: string | null
  requiredKeywords: string[]
  optionalKeywords: string[]
  requiredKeywordGroups: KeywordGroup[] | null
  optionalKeywordGroups: KeywordGroup[] | null
  modelAnswer: string | null
}) {
  const baseRubric = stepRubric?.trim()
    ? stepRubric.trim()
    : 'No written step rubric configured.'

  return `
Scenario Title:
${scenarioTitle}

Scenario Description:
${scenarioDescription}

Current Step:
${stepTitle}

Step Prompt:
${stepPrompt}

Step Rubric:
${baseRubric}

Required Keywords:
${requiredKeywords.length > 0 ? requiredKeywords.join(', ') : 'No required keywords configured.'}

Optional Keywords:
${optionalKeywords.length > 0 ? optionalKeywords.join(', ') : 'No optional keywords configured.'}

Required Keyword Groups:
${formatKeywordGroupsForRubric(requiredKeywordGroups)}

Optional Keyword Groups:
${formatKeywordGroupsForRubric(optionalKeywordGroups)}

Model Answer:
${modelAnswer?.trim() || 'No model answer configured.'}

Evaluation Instruction:
Evaluate only the student's answer for this current scenario step.
The student may answer in Thai, English, or mixed Thai-English.
If the required clinical meaning is present using equivalent Thai or English wording, count it as present.
Do not evaluate future scenario steps.
Do not introduce medical information that is not provided here.
`
}

async function getAuthenticatedStudent() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const extractedStudentId = user.email?.split('@')[0]

  if (!extractedStudentId) {
    throw new Error('Invalid user data')
  }

  const dbStudent = await prisma.student.upsert({
    where: {
      studentId: extractedStudentId,
    },
    update: {
      email: user.email,
    },
    create: {
      studentId: extractedStudentId,
      name: extractedStudentId,
      email: user.email,
    },
  })

  return dbStudent
}

export async function submitScenarioStepAnswer(formData: FormData) {
  const scenarioId = formData.get('scenarioId') as string | null
  const scenarioStepId = formData.get('scenarioStepId') as string | null
  const answer = formData.get('answer') as string | null

  if (!scenarioId) {
    throw new Error('Scenario ID is missing')
  }

  if (!scenarioStepId) {
    throw new Error('Scenario step ID is missing')
  }

  const cleanAnswer = answer?.trim() || ''

  if (!cleanAnswer) {
    throw new Error('Step answer cannot be empty')
  }

  if (cleanAnswer.length > MAX_STEP_ANSWER_LENGTH) {
    throw new Error('Step answer must be 2,000 characters or fewer')
  }

  const dbStudent = await getAuthenticatedStudent()

  const scenario = await prisma.scenario.findUnique({
    where: {
      id: scenarioId,
    },
  })

  if (!scenario) {
    throw new Error('Scenario not found')
  }

  const scenarioStep = await prisma.scenarioStep.findFirst({
    where: {
      id: scenarioStepId,
      scenarioId: scenario.id,
    },
  })

  if (!scenarioStep) {
    throw new Error('Scenario step not found')
  }

  let attempt = await prisma.attempt.findFirst({
    where: {
      studentId: dbStudent.id,
      scenarioId: scenario.id,
      isCompleted: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!attempt) {
    attempt = await prisma.attempt.create({
      data: {
        studentId: dbStudent.id,
        scenarioId: scenario.id,
        primaryDiagnosis: null,
        interventions: null,
        isCompleted: false,
        aiStatus: 'pending',
        aiReasoning: 'Step-by-step practice in progress.',
      },
    })
  }

  const existingAttemptStep = await prisma.attemptStep.findUnique({
    where: {
      attemptId_scenarioStepId: {
        attemptId: attempt.id,
        scenarioStepId: scenarioStep.id,
      },
    },
  })

  if (existingAttemptStep?.isLocked) {
    redirect(
      `/dashboard/scenario/${scenario.id}?attemptId=${attempt.id}&stepId=${scenarioStep.id}`
    )
  }

  const currentAttemptCount = existingAttemptStep?.attemptCount ?? 0

  if (currentAttemptCount >= MAX_STEP_ATTEMPTS) {
    await prisma.attemptStep.upsert({
      where: {
        attemptId_scenarioStepId: {
          attemptId: attempt.id,
          scenarioStepId: scenarioStep.id,
        },
      },
      update: {
        isLocked: true,
        modelAnswerRevealed: true,
      },
      create: {
        attemptId: attempt.id,
        scenarioStepId: scenarioStep.id,
        answer: cleanAnswer,
        attemptCount: MAX_STEP_ATTEMPTS,
        isLocked: true,
        modelAnswerRevealed: true,
        aiStatus: 'completed',
        aiScore: 'incorrect',
        aiReasoning:
          'The maximum number of attempts has been reached. Please review the model answer before continuing.',
        aiMissingElements: [],
      },
    })

    redirect(
      `/dashboard/scenario/${scenario.id}?attemptId=${attempt.id}&stepId=${scenarioStep.id}`
    )
  }

  const nextAttemptCount = currentAttemptCount + 1

  const requiredKeywordGroups = parseKeywordGroups(
    scenarioStep.requiredKeywordGroups
  )
  const optionalKeywordGroups = parseKeywordGroups(
    scenarioStep.optionalKeywordGroups
  )

  try {
    const ruleResult = evaluateWithRuleBasedLayer({
      studentResponse: cleanAnswer,
      requiredKeywords: scenarioStep.requiredKeywords,
      optionalKeywords: scenarioStep.optionalKeywords,
      requiredKeywordGroups,
      optionalKeywordGroups,
    })

    let finalScore = ruleResult.score
    let finalReasoning = ruleResult.reasoning
    let finalMissingElements = ruleResult.missing_elements

    if (ruleResult.shouldUseLLM) {
      const rubricContext = buildStepRubricContext({
        scenarioTitle: scenario.title,
        scenarioDescription: scenario.description,
        stepTitle: scenarioStep.title,
        stepPrompt: scenarioStep.prompt,
        stepRubric: scenarioStep.rubric,
        requiredKeywords: scenarioStep.requiredKeywords,
        optionalKeywords: scenarioStep.optionalKeywords,
        requiredKeywordGroups,
        optionalKeywordGroups,
        modelAnswer: scenarioStep.modelAnswer,
      })

      const aiResult = await evaluateWithGemini(cleanAnswer, rubricContext)

      finalScore = aiResult.score
      finalReasoning = aiResult.reasoning
      finalMissingElements = aiResult.missing_elements || []
    }

    const isCorrect = finalScore === 'correct'
    const shouldRevealModelAnswer =
      !isCorrect && nextAttemptCount >= MAX_STEP_ATTEMPTS
    const shouldLockStep = isCorrect || shouldRevealModelAnswer

    await prisma.attemptStep.upsert({
      where: {
        attemptId_scenarioStepId: {
          attemptId: attempt.id,
          scenarioStepId: scenarioStep.id,
        },
      },
      update: {
        answer: cleanAnswer,
        aiScore: finalScore,
        aiReasoning: finalReasoning,
        aiMissingElements: finalMissingElements,
        aiStatus: 'completed',
        attemptCount: nextAttemptCount,
        isLocked: shouldLockStep,
        modelAnswerRevealed: shouldRevealModelAnswer,
      },
      create: {
        attemptId: attempt.id,
        scenarioStepId: scenarioStep.id,
        answer: cleanAnswer,
        aiScore: finalScore,
        aiReasoning: finalReasoning,
        aiMissingElements: finalMissingElements,
        aiStatus: 'completed',
        attemptCount: nextAttemptCount,
        isLocked: shouldLockStep,
        modelAnswerRevealed: shouldRevealModelAnswer,
      },
    })
  } catch {
    await prisma.attemptStep.upsert({
      where: {
        attemptId_scenarioStepId: {
          attemptId: attempt.id,
          scenarioStepId: scenarioStep.id,
        },
      },
      update: {
        answer: cleanAnswer,
        aiStatus: 'failed',
      },
      create: {
        attemptId: attempt.id,
        scenarioStepId: scenarioStep.id,
        answer: cleanAnswer,
        aiStatus: 'failed',
        attemptCount: currentAttemptCount,
        isLocked: false,
        modelAnswerRevealed: false,
      },
    })
  }

  redirect(
    `/dashboard/scenario/${scenario.id}?attemptId=${attempt.id}&stepId=${scenarioStep.id}`
  )
}

export async function resetScenarioPractice(formData: FormData) {
  const scenarioId = formData.get('scenarioId') as string | null

  if (!scenarioId) {
    throw new Error('Scenario ID is missing')
  }

  const dbStudent = await getAuthenticatedStudent()

  const scenario = await prisma.scenario.findUnique({
    where: {
      id: scenarioId,
    },
  })

  if (!scenario) {
    throw new Error('Scenario not found')
  }

  await prisma.$transaction(async (tx) => {
    await tx.attemptStep.deleteMany({
      where: {
        attempt: {
          studentId: dbStudent.id,
          scenarioId: scenario.id,
          isCompleted: false,
        },
      },
    })

    await tx.attempt.deleteMany({
      where: {
        studentId: dbStudent.id,
        scenarioId: scenario.id,
        isCompleted: false,
      },
    })
  })

  revalidatePath(`/dashboard/scenario/${scenario.id}`)
  redirect(`/dashboard/scenario/${scenario.id}`)
}

export async function submitAssessment(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const extractedStudentId = user.email?.split('@')[0]

  if (!extractedStudentId) {
    throw new Error('Invalid user data')
  }

  const scenarioId = formData.get('scenarioId') as string | null
  const primaryDiagnosis = formData.get('primaryDiagnosis') as string | null
  const interventions = formData.get('interventions') as string | null

  if (!scenarioId) {
    throw new Error('Scenario ID is missing')
  }

  if (!primaryDiagnosis?.trim() || !interventions?.trim()) {
    throw new Error('Diagnosis and interventions cannot be empty')
  }

  const scenario = await prisma.scenario.findUnique({
    where: {
      id: scenarioId,
    },
  })

  if (!scenario) {
    throw new Error('Scenario not found')
  }

  const requiredKeywordGroups = parseKeywordGroups(
    scenario.requiredKeywordGroups
  )
  const optionalKeywordGroups = parseKeywordGroups(scenario.optionalKeywordGroups)

  const dbStudent = await prisma.student.upsert({
    where: {
      studentId: extractedStudentId,
    },
    update: {
      email: user.email,
    },
    create: {
      studentId: extractedStudentId,
      name: extractedStudentId,
      email: user.email,
    },
  })

  const attempt = await prisma.attempt.create({
    data: {
      studentId: dbStudent.id,
      scenarioId: scenario.id,
      primaryDiagnosis: primaryDiagnosis.trim(),
      interventions: interventions.trim(),
      isCompleted: true,
      aiStatus: 'pending',
    },
  })

  const combinedStudentResponse = `
Diagnosis:
${primaryDiagnosis.trim()}

Interventions:
${interventions.trim()}
`

  try {
    const ruleResult = evaluateWithRuleBasedLayer({
      studentResponse: combinedStudentResponse,
      requiredKeywords: scenario.requiredKeywords,
      optionalKeywords: scenario.optionalKeywords,
      requiredKeywordGroups,
      optionalKeywordGroups,
    })

    if (!ruleResult.shouldUseLLM) {
      await prisma.attempt.update({
        where: {
          id: attempt.id,
        },
        data: {
          aiScore: ruleResult.score,
          aiReasoning: ruleResult.reasoning,
          aiMissingElements: ruleResult.missing_elements,
          aiStatus: 'completed',
        },
      })
    } else {
      const rubricContext = buildRubricContext({
        scenarioTitle: scenario.title,
        scenarioDescription: scenario.description,
        rubric: scenario.rubric,
        requiredKeywords: scenario.requiredKeywords,
        optionalKeywords: scenario.optionalKeywords,
        requiredKeywordGroups,
        optionalKeywordGroups,
        modelAnswer: scenario.modelAnswer,
      })

      const aiResult = await evaluateWithGemini(
        combinedStudentResponse,
        rubricContext
      )

      await prisma.attempt.update({
        where: {
          id: attempt.id,
        },
        data: {
          aiScore: aiResult.score,
          aiReasoning: aiResult.reasoning,
          aiMissingElements: aiResult.missing_elements || [],
          aiStatus: 'completed',
        },
      })
    }
  } catch {
    await prisma.attempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        aiStatus: 'failed',
      },
    })
  }

  redirect(`/dashboard/scenario/${scenario.id}/success?attemptId=${attempt.id}`)
}