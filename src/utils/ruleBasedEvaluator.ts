// src/utils/ruleBasedEvaluator.ts

export type KeywordGroup = {
  label: string
  keywords: string[]
}

export type RuleBasedEvaluationResult = {
  score: 'correct' | 'partial' | 'incorrect'
  reasoning: string
  missing_elements: string[]
  matchedRequiredKeywords: string[]
  matchedOptionalKeywords: string[]
  requiredMatchRatio: number
  shouldUseLLM: boolean
}

type RuleBasedEvaluatorInput = {
  studentResponse: string

  /**
   * Legacy flat keyword support.
   * Keep this field so existing Scenario and ScenarioStep records continue working.
   */
  requiredKeywords: string[]
  optionalKeywords?: string[]

  /**
   * New grouped keyword support.
   * Each group represents one required clinical concept.
   * A group passes if the student response contains at least one keyword from that group.
   */
  requiredKeywordGroups?: KeywordGroup[] | null
  optionalKeywordGroups?: KeywordGroup[] | null
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
}

function keywordExistsInText(normalizedText: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword)

  if (!normalizedKeyword) {
    return false
  }

  return normalizedText.includes(normalizedKeyword)
}

function cleanKeywordList(keywords: string[]) {
  return keywords.map((keyword) => keyword.trim()).filter(Boolean)
}

function cleanKeywordGroups(groups?: KeywordGroup[] | null) {
  if (!groups || !Array.isArray(groups)) {
    return []
  }

  return groups
    .map((group) => ({
      label: group.label.trim(),
      keywords: cleanKeywordList(group.keywords ?? []),
    }))
    .filter((group) => group.label && group.keywords.length > 0)
}

function evaluateGroupedKeywords({
  normalizedResponse,
  requiredKeywordGroups,
  optionalKeywordGroups,
}: {
  normalizedResponse: string
  requiredKeywordGroups: KeywordGroup[]
  optionalKeywordGroups: KeywordGroup[]
}) {
  const matchedRequiredKeywords: string[] = []
  const missingRequiredGroups: string[] = []

  for (const group of requiredKeywordGroups) {
    const matchedKeyword = group.keywords.find((keyword) =>
      keywordExistsInText(normalizedResponse, keyword)
    )

    if (matchedKeyword) {
      matchedRequiredKeywords.push(matchedKeyword)
    } else {
      missingRequiredGroups.push(group.label)
    }
  }

  const matchedOptionalKeywords: string[] = []

  for (const group of optionalKeywordGroups) {
    const matchedKeyword = group.keywords.find((keyword) =>
      keywordExistsInText(normalizedResponse, keyword)
    )

    if (matchedKeyword) {
      matchedOptionalKeywords.push(matchedKeyword)
    }
  }

  const requiredMatchRatio =
    requiredKeywordGroups.length === 0
      ? 0
      : matchedRequiredKeywords.length / requiredKeywordGroups.length

  return {
    matchedRequiredKeywords,
    matchedOptionalKeywords,
    missingRequiredGroups,
    requiredMatchRatio,
  }
}

function evaluateFlatKeywords({
  normalizedResponse,
  requiredKeywords,
  optionalKeywords,
}: {
  normalizedResponse: string
  requiredKeywords: string[]
  optionalKeywords: string[]
}) {
  const cleanRequiredKeywords = cleanKeywordList(requiredKeywords)
  const cleanOptionalKeywords = cleanKeywordList(optionalKeywords)

  const matchedRequiredKeywords = cleanRequiredKeywords.filter((keyword) =>
    keywordExistsInText(normalizedResponse, keyword)
  )

  const matchedOptionalKeywords = cleanOptionalKeywords.filter((keyword) =>
    keywordExistsInText(normalizedResponse, keyword)
  )

  const missingRequiredKeywords = cleanRequiredKeywords.filter(
    (keyword) => !matchedRequiredKeywords.includes(keyword)
  )

  const requiredMatchRatio =
    cleanRequiredKeywords.length === 0
      ? 0
      : matchedRequiredKeywords.length / cleanRequiredKeywords.length

  return {
    cleanRequiredKeywords,
    matchedRequiredKeywords,
    matchedOptionalKeywords,
    missingRequiredKeywords,
    requiredMatchRatio,
  }
}

export function evaluateWithRuleBasedLayer({
  studentResponse,
  requiredKeywords,
  optionalKeywords = [],
  requiredKeywordGroups,
  optionalKeywordGroups,
}: RuleBasedEvaluatorInput): RuleBasedEvaluationResult {
  const normalizedResponse = normalizeText(studentResponse)

  const cleanRequiredKeywordGroups = cleanKeywordGroups(requiredKeywordGroups)
  const cleanOptionalKeywordGroups = cleanKeywordGroups(optionalKeywordGroups)

  if (cleanRequiredKeywordGroups.length > 0) {
    const {
      matchedRequiredKeywords,
      matchedOptionalKeywords,
      missingRequiredGroups,
      requiredMatchRatio,
    } = evaluateGroupedKeywords({
      normalizedResponse,
      requiredKeywordGroups: cleanRequiredKeywordGroups,
      optionalKeywordGroups: cleanOptionalKeywordGroups,
    })

    if (requiredMatchRatio === 1) {
      return {
        score: 'correct',
        reasoning:
          'Rule-based evaluation passed. The response contains all required clinical concept groups for this scenario.',
        missing_elements: [],
        matchedRequiredKeywords,
        matchedOptionalKeywords,
        requiredMatchRatio,
        shouldUseLLM: false,
      }
    }

    return {
      score: requiredMatchRatio > 0 ? 'partial' : 'incorrect',
      reasoning:
        'Rule-based evaluation found missing required clinical concept groups. Semantic AI evaluation is required to check whether the student used equivalent clinical wording.',
      missing_elements: missingRequiredGroups,
      matchedRequiredKeywords,
      matchedOptionalKeywords,
      requiredMatchRatio,
      shouldUseLLM: true,
    }
  }

  const {
    cleanRequiredKeywords,
    matchedRequiredKeywords,
    matchedOptionalKeywords,
    missingRequiredKeywords,
    requiredMatchRatio,
  } = evaluateFlatKeywords({
    normalizedResponse,
    requiredKeywords,
    optionalKeywords,
  })

  if (cleanRequiredKeywords.length > 0 && requiredMatchRatio === 1) {
    return {
      score: 'correct',
      reasoning:
        'Rule-based evaluation passed. The response contains all required clinical keywords for this scenario.',
      missing_elements: [],
      matchedRequiredKeywords,
      matchedOptionalKeywords,
      requiredMatchRatio,
      shouldUseLLM: false,
    }
  }

  if (cleanRequiredKeywords.length === 0) {
    return {
      score: 'partial',
      reasoning:
        'No required keywords are configured for this scenario. Semantic AI evaluation is required.',
      missing_elements: [],
      matchedRequiredKeywords,
      matchedOptionalKeywords,
      requiredMatchRatio,
      shouldUseLLM: true,
    }
  }

  return {
    score: requiredMatchRatio > 0 ? 'partial' : 'incorrect',
    reasoning:
      'Rule-based evaluation found missing required keywords. Semantic AI evaluation is required to check whether the student used equivalent clinical wording.',
    missing_elements: missingRequiredKeywords,
    matchedRequiredKeywords,
    matchedOptionalKeywords,
    requiredMatchRatio,
    shouldUseLLM: true,
  }
}