'use server'

import { createClient } from '@/utils/supabase/server'
import prisma from '@/utils/prisma'
import { redirect } from 'next/navigation'
import { evaluateWithGemini } from '@/utils/aiEvaluator'
import {
  evaluateWithRuleBasedLayer,
  type KeywordGroup,
} from '@/utils/ruleBasedEvaluator'

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

  console.log('--- CREATED ATTEMPT ---', attempt.id)

  const combinedStudentResponse = `
Diagnosis:
${primaryDiagnosis.trim()}

Interventions:
${interventions.trim()}
`

  try {
    console.log('--- RUNNING RULE-BASED EVALUATION ---')

    const ruleResult = evaluateWithRuleBasedLayer({
      studentResponse: combinedStudentResponse,
      requiredKeywords: scenario.requiredKeywords,
      optionalKeywords: scenario.optionalKeywords,
      requiredKeywordGroups,
      optionalKeywordGroups,
    })

    console.log('--- RULE-BASED RESULT ---')
    console.log(ruleResult)

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

      console.log('--- ATTEMPT UPDATED WITH RULE-BASED RESULT ---', attempt.id)
    } else {
      console.log('--- SENDING TO GEMINI AI ---')

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

      console.log('--- AI EVALUATION RESULT ---')
      console.log(aiResult)

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

      console.log('--- ATTEMPT UPDATED WITH AI RESULTS ---', attempt.id)
    }
  } catch (error) {
    console.error('--- EVALUATION FAILED BUT ATTEMPT WAS SAVED ---', error)

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