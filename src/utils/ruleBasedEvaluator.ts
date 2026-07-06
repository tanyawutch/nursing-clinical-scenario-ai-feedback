// src/utils/ruleBasedEvaluator.ts

export type KeywordGroup = {
  label: string
  keywords: string[]
  points?: number
  category?: string
  avoidNegation?: boolean
}

export type RuleBasedEvaluationResult = {
  score: 'correct' | 'partial' | 'incorrect'
  reasoning: string
  missing_elements: string[]
  matchedRequiredKeywords: string[]
  matchedOptionalKeywords: string[]
  requiredMatchRatio: number
  shouldUseLLM: boolean
  numericScore: number
  maxScore: number
  passScore: number
  matchedElements: string[]
  evaluationDetails: {
    totalRequired: number
    matchedRequired: number
    categories: Record<string, { score: number; maxScore: number }>
  }
}

type RuleBasedEvaluatorInput = {
  studentResponse: string
  requiredKeywords: string[]
  optionalKeywords?: string[]
  requiredKeywordGroups?: KeywordGroup[] | null
  optionalKeywordGroups?: KeywordGroup[] | null
  maxScore?: number
  passScore?: number
}

const NEGATION_PREFIXES = [
  'ไม่มี',
  'ไม่ มี',
  'ไม่',
  'ปฏิเสธ',
  'ปฎิเสธ',
  'no ',
  'not ',
  'deny',
  'denies',
  'without',
]

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasNearbyNegation(normalizedText: string, startIndex: number) {
  const prefix = normalizedText.slice(Math.max(0, startIndex - 16), startIndex)

  return NEGATION_PREFIXES.some((negation) => prefix.endsWith(negation))
}

function keywordExistsInText(
  normalizedText: string,
  keyword: string,
  avoidNegation = true
) {
  const normalizedKeyword = normalizeText(keyword)

  if (!normalizedKeyword) {
    return false
  }

  let searchIndex = normalizedText.indexOf(normalizedKeyword)

  while (searchIndex >= 0) {
    if (!avoidNegation || !hasNearbyNegation(normalizedText, searchIndex)) {
      return true
    }

    searchIndex = normalizedText.indexOf(
      normalizedKeyword,
      searchIndex + normalizedKeyword.length
    )
  }

  return false
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
      points: Number.isFinite(group.points) ? Number(group.points) : 1,
      category: group.category?.trim() || 'General',
      avoidNegation: group.avoidNegation ?? true,
    }))
    .filter((group) => group.label && group.keywords.length > 0)
}

function createEmptyDetails(): RuleBasedEvaluationResult['evaluationDetails'] {
  return {
    totalRequired: 0,
    matchedRequired: 0,
    categories: {},
  }
}

export function evaluateWithRuleBasedLayer({
  studentResponse,
  requiredKeywords,
  optionalKeywords = [],
  requiredKeywordGroups,
  optionalKeywordGroups,
  maxScore,
  passScore,
}: RuleBasedEvaluatorInput): RuleBasedEvaluationResult {
  const normalizedResponse = normalizeText(studentResponse)
  const cleanRequiredKeywordGroups = cleanKeywordGroups(requiredKeywordGroups)
  const cleanOptionalKeywordGroups = cleanKeywordGroups(optionalKeywordGroups)

  if (cleanRequiredKeywordGroups.length > 0) {
    const matchedRequiredKeywords: string[] = []
    const matchedElements: string[] = []
    const missingRequiredGroups: string[] = []
    const details = createEmptyDetails()

    const rubricMaxScore =
      maxScore ??
      cleanRequiredKeywordGroups.reduce(
        (total, group) => total + (group.points ?? 1),
        0
      )
    const rubricPassScore = passScore ?? rubricMaxScore

    details.totalRequired = cleanRequiredKeywordGroups.length

    for (const group of cleanRequiredKeywordGroups) {
      const category = group.category || 'General'
      details.categories[category] ??= { score: 0, maxScore: 0 }
      details.categories[category].maxScore += group.points ?? 1

      const matchedKeyword = group.keywords.find((keyword) =>
        keywordExistsInText(
          normalizedResponse,
          keyword,
          group.avoidNegation ?? true
        )
      )

      if (matchedKeyword) {
        details.matchedRequired += 1
        details.categories[category].score += group.points ?? 1
        matchedRequiredKeywords.push(matchedKeyword)
        matchedElements.push(group.label)
      } else {
        missingRequiredGroups.push(group.label)
      }
    }

    const matchedOptionalKeywords: string[] = []

    for (const group of cleanOptionalKeywordGroups) {
      const matchedKeyword = group.keywords.find((keyword) =>
        keywordExistsInText(
          normalizedResponse,
          keyword,
          group.avoidNegation ?? true
        )
      )

      if (matchedKeyword) {
        matchedOptionalKeywords.push(matchedKeyword)
      }
    }

    const numericScore = Object.values(details.categories).reduce(
      (total, category) => total + category.score,
      0
    )
    const requiredMatchRatio =
      cleanRequiredKeywordGroups.length === 0
        ? 0
        : details.matchedRequired / cleanRequiredKeywordGroups.length
    const passed = numericScore >= rubricPassScore

    return {
      score: passed
        ? 'correct'
        : numericScore > 0
          ? 'partial'
          : 'incorrect',
      reasoning: passed
        ? `ผ่านเกณฑ์ตาม rubric ได้ ${numericScore}/${rubricMaxScore} คะแนน`
        : `ยังไม่ผ่านเกณฑ์ตาม rubric ได้ ${numericScore}/${rubricMaxScore} คะแนน ต้องได้อย่างน้อย ${rubricPassScore} คะแนน`,
      missing_elements: missingRequiredGroups,
      matchedRequiredKeywords,
      matchedOptionalKeywords,
      requiredMatchRatio,
      shouldUseLLM: !passed && missingRequiredGroups.length > 0,
      numericScore,
      maxScore: rubricMaxScore,
      passScore: rubricPassScore,
      matchedElements,
      evaluationDetails: details,
    }
  }

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
  const rubricMaxScore = maxScore ?? cleanRequiredKeywords.length
  const rubricPassScore = passScore ?? rubricMaxScore
  const numericScore = matchedRequiredKeywords.length
  const passed = cleanRequiredKeywords.length > 0 && numericScore >= rubricPassScore

  return {
    score: passed ? 'correct' : numericScore > 0 ? 'partial' : 'incorrect',
    reasoning: passed
      ? `ผ่านเกณฑ์ตาม keyword ได้ ${numericScore}/${rubricMaxScore} คะแนน`
      : `ยังไม่ผ่านเกณฑ์ตาม keyword ได้ ${numericScore}/${rubricMaxScore} คะแนน`,
    missing_elements: missingRequiredKeywords,
    matchedRequiredKeywords,
    matchedOptionalKeywords,
    requiredMatchRatio,
    shouldUseLLM: !passed,
    numericScore,
    maxScore: rubricMaxScore,
    passScore: rubricPassScore,
    matchedElements: matchedRequiredKeywords,
    evaluationDetails: {
      totalRequired: cleanRequiredKeywords.length,
      matchedRequired: matchedRequiredKeywords.length,
      categories: {
        General: {
          score: numericScore,
          maxScore: rubricMaxScore,
        },
      },
    },
  }
}
