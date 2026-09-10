export type PageLanguage = 'th' | 'en'

export type FeedbackFormField = {
  id: string
  labelTh: string
  labelEn: string
  placeholderTh?: string
  placeholderEn?: string
  rows?: number
}

export type SubmittedAnswerSection = {
  id: string
  label: string
  answer: string
}

type FeedbackTone = 'passed' | 'partial' | 'notPassed' | 'pending'

type PracticeFeedbackPanelProps = {
  lang: PageLanguage
  score?: string | null
  aiStatus?: string | null
  numericScore?: number | null
  maxScore?: number | null
  passScore?: number | null
  matchedElements?: string[] | null
  missingElements?: string[] | null
  baseReasoning?: string | null
  answerSections?: SubmittedAnswerSection[] | null
  modelAnswer?: string | null
  modelAnswerRevealed?: boolean | null
  remainingAttempts?: number | null
  showScoreHeader?: boolean
  compact?: boolean
}

export function getScoreLabel(score: string | null | undefined, lang: PageLanguage) {
  if (lang === 'en') {
    if (score === 'correct') return 'Passed'
    if (score === 'partial') return 'Needs review'
    if (score === 'incorrect') return 'Not yet passed'
    return 'Pending'
  }

  if (score === 'correct') return 'ผ่านเกณฑ์'
  if (score === 'partial') return 'ต้องปรับปรุง'
  if (score === 'incorrect') return 'ยังไม่ผ่าน'
  return 'รอตรวจ'
}

export function parseSubmittedSections(
  fields: FeedbackFormField[],
  answer: string | null | undefined,
  lang: PageLanguage
): SubmittedAnswerSection[] {
  const cleanAnswer = answer?.trim() || ''

  if (!cleanAnswer) {
    return fields.map((field) => ({
      id: field.id,
      label: lang === 'th' ? field.labelTh : field.labelEn,
      answer: '',
    }))
  }

  if (fields.length === 0) {
    return [
      {
        id: 'freeText',
        label: lang === 'th' ? 'คำตอบรวม' : 'Overall response',
        answer: cleanAnswer,
      },
    ]
  }

  const blocks = cleanAnswer.split(/\n{2,}/)

  return fields.map((field) => {
    const labels = [field.labelTh, field.labelEn]
    const block = blocks.find((item) =>
      labels.some((label) => item.startsWith(label + ':'))
    )
    const parsedAnswer = block ? block.slice(block.indexOf(':') + 1).trim() : ''

    return {
      id: field.id,
      label: lang === 'th' ? field.labelTh : field.labelEn,
      answer: parsedAnswer,
    }
  })
}

function getFeedbackTone(score: string | null | undefined): FeedbackTone {
  if (score === 'correct') return 'passed'
  if (score === 'partial') return 'partial'
  if (score === 'incorrect') return 'notPassed'
  return 'pending'
}

function buildDetailedFeedback({
  lang,
  score,
  numericScore,
  maxScore,
  passScore,
  matchedCount,
  missingCount,
  baseReasoning,
}: {
  lang: PageLanguage
  score?: string | null
  numericScore: number
  maxScore: number
  passScore: number
  matchedCount: number
  missingCount: number
  baseReasoning?: string | null
}) {
  const tone = getFeedbackTone(score)
  const base = baseReasoning?.trim()
  const scoreText = numericScore + '/' + maxScore

  if (lang === 'en') {
    if (tone === 'passed') {
      return 'You covered the important clinical points well and reached the passing standard with ' + scoreText + ' points. ' + (missingCount > 0 ? 'There are still ' + missingCount + ' point(s) you can add to make the response more complete.' : 'Your response is sufficiently complete for this rubric.') + (base ? ' System note: ' + base : '')
    }
    if (tone === 'partial') {
      return 'You included some relevant clinical points, but the response is not comprehensive enough yet. You matched ' + matchedCount + ' point(s) and scored ' + scoreText + '; the passing score is ' + passScore + '/' + maxScore + '. Review the missing items below and add more specific questions or statements.' + (base ? ' System note: ' + base : '')
    }
    if (tone === 'notPassed') {
      return 'This response still needs more clinical coverage. Start by adding the key questions or statements listed below, then connect them clearly to the patient scenario. Current score: ' + scoreText + '; pass score: ' + passScore + '/' + maxScore + '.' + (base ? ' System note: ' + base : '')
    }
    return 'The system reviewed the response and is preparing feedback.'
  }

  if (tone === 'passed') {
    return 'ตอนนี้ผู้เรียนตอบได้ครอบคลุมประเด็นสำคัญดีและผ่านเกณฑ์แล้ว ได้ ' + scoreText + ' คะแนน ' + (missingCount > 0 ? 'ยังมีอีก ' + missingCount + ' ประเด็นที่สามารถเติมเพื่อให้คำตอบสมบูรณ์ขึ้น' : 'คำตอบนี้ครบถ้วนเพียงพอตาม rubric แล้ว') + (base ? ' หมายเหตุจากระบบ: ' + base : '')
  }
  if (tone === 'partial') {
    return 'ผู้เรียนตอบถูกบางส่วนและมีแนวทางที่ดีแล้ว แต่ยังครอบคลุมไม่พอสำหรับเกณฑ์ผ่าน ตอนนี้ระบบตรวจพบ ' + matchedCount + ' ประเด็น ได้ ' + scoreText + ' คะแนน โดยเกณฑ์ผ่านคือ ' + passScore + '/' + maxScore + ' คะแนน ควรเติมคำถามหรือคำตอบตามประเด็นที่ควรเพิ่มด้านล่างให้ชัดเจนขึ้น' + (base ? ' หมายเหตุจากระบบ: ' + base : '')
  }
  if (tone === 'notPassed') {
    return 'คำตอบรอบนี้ยังไม่ครอบคลุมประเด็นหลักพอ แนะนำให้เติมหัวข้อที่ระบบระบุไว้ด้านล่าง และเขียนให้สัมพันธ์กับสถานการณ์ผู้ป่วย คะแนนปัจจุบันคือ ' + scoreText + ' คะแนน เกณฑ์ผ่านคือ ' + passScore + '/' + maxScore + ' คะแนน' + (base ? ' หมายเหตุจากระบบ: ' + base : '')
  }
  return 'ระบบตรวจคำตอบแล้วและกำลังเตรียม feedback'
}

function getImprovementGuidance(element: string, lang: PageLanguage) {
  const item = element.toLowerCase()
  const thaiGuidance: Array<[string, string]> = [
    ['ลักษณะ', 'ควรถามว่า “ปวดแบบไหน เช่น ปวดตื้อ ปวดแปล๊บ ปวดร้าว หรือปวดเป็นพัก ๆ หรือไม่”'],
    ['เวลาเริ่ม', 'ควรถามว่า “เริ่มปวดเมื่อไร ปวดมากี่วันแล้ว และเริ่มหลังทำกิจกรรมอะไรหรือไม่”'],
    ['ตำแหน่ง', 'ควรถามว่า “ปวดตรงไหนของหลัง ชี้ตำแหน่งได้ไหม และปวดเฉพาะจุดหรือกระจายไปที่อื่น”'],
    ['ระยะเวลา', 'ควรถามว่า “แต่ละครั้งปวดนานเท่าไร ปวดต่อเนื่องหรือเป็น ๆ หาย ๆ”'],
    ['ระดับ', 'ควรถามคะแนนความปวด เช่น “ถ้าให้ 0-10 ตอนนี้ปวดกี่คะแนน”'],
    ['กระตุ้น', 'ควรถามว่า “ทำอะไรแล้วปวดมากขึ้น เช่น ยกของ ก้ม เอี้ยวตัว เดิน หรือทำงานนาน ๆ”'],
    ['บรรเทา', 'ควรถามว่า “พักแล้วดีขึ้นไหม รับประทานยาแก้ปวดแล้วทุเลาหรือไม่”'],
    ['ไข้', 'ควรถามอาการไข้ หนาวสั่น หรืออาการติดเชื้อร่วมด้วย'],
    ['ร้าว', 'ควรถามว่า “ปวดร้าวลงสะโพกหรือลงขาหรือไม่” เพื่อคัดกรองเส้นประสาทถูกกดทับ'],
    ['ชา', 'ควรถามเรื่องชา อ่อนแรง เดินลำบาก หรือกำลังกล้ามเนื้อลดลง'],
    ['ปัสสาวะ', 'ควรถามเรื่องปัสสาวะแสบขัด กลั้นปัสสาวะไม่ได้ หรือความผิดปกติของการขับถ่าย'],
    ['muscle strain', 'ควรระบุ Muscle strain/Back pain/Low back pain พร้อมเหตุผลจาก mechanical pain และประวัติยกของหนัก'],
    ['hnp', 'ควรระบุ HNP/Sciatica เป็น differential diagnosis พร้อมเหตุผลสนับสนุนและเหตุผลที่ยังไม่เด่น'],
    ['osteoporosis', 'ควรระบุ Osteoporosis พร้อมเหตุผล เช่น เพศหญิงวัยหมดประจำเดือนและปัจจัยเสี่ยงเรื่องมวลกระดูก'],
    ['x-ray', 'ควรระบุการส่ง Film L-S spine หรือ X-ray lumbar spine AP ให้ชัดเจน'],
    ['film', 'ควรระบุการส่ง Film L-S spine หรือ X-ray lumbar spine AP ให้ชัดเจน'],
    ['normal', 'ควรเขียนการแปลผลว่า Muscle strain มักไม่พบความผิดปกติจากภาพถ่ายรังสี'],
    ['nsaid', 'ควรระบุยาแก้ปวด/NSAIDs ตามความเหมาะสม พร้อมข้อควรระวังและการติดตามอาการ'],
    ['dmethod', 'ควรให้คำแนะนำผู้ป่วยตาม DMETHOD ให้ครบ เช่น disease, medication, environment, treatment, health, outpatient และ diet'],
  ]
  const englishGuidance: Array<[string, string]> = [
    ['characteristic', 'Ask about the character of pain, such as dull, sharp, radiating, intermittent, or constant pain.'],
    ['onset', 'Ask when the pain started, how many days it has been present, and whether it followed a specific activity.'],
    ['location', 'Ask the patient to identify the exact pain location and whether it spreads elsewhere.'],
    ['duration', 'Ask how long each episode lasts and whether the pain is constant or intermittent.'],
    ['severity', 'Ask for a pain score from 0 to 10.'],
    ['hnp', 'Add HNP/Sciatica as a differential diagnosis with supporting and opposing reasons.'],
    ['osteoporosis', 'Add osteoporosis with risk factors such as post-menopausal age and bone-density concerns.'],
    ['x-ray', 'Specify Film L-S spine or lumbar spine AP X-ray and explain expected findings.'],
  ]
  const list = lang === 'th' ? thaiGuidance : englishGuidance
  const matched = list.find(([keyword]) => item.includes(keyword))
  if (matched) return matched[1]
  return lang === 'th'
    ? 'ควรเพิ่มรายละเอียดเรื่อง “' + element + '” ให้ชัดเจน โดยเขียนเป็นคำถามหรือคำตอบที่เชื่อมกับสถานการณ์ผู้ป่วย'
    : 'Add a clearer question or statement about “' + element + '” and connect it to this patient scenario.'
}

function buildClosingFeedback({
  lang,
  score,
  remainingAttempts,
}: {
  lang: PageLanguage
  score?: string | null
  remainingAttempts: number
}) {
  const tone = getFeedbackTone(score)
  if (lang === 'en') {
    if (tone === 'passed') return 'Well done. The response met the rubric standard; continued practice can make the clinical communication even clearer and more confident.'
    return remainingAttempts > 0
      ? 'This is moving in the right direction. Use the suggestions above, revise the response, and try again with more complete clinical detail.'
      : 'This attempt did not pass yet, but it is still useful practice. Review the reference answer and use it to strengthen the next case.'
  }
  if (tone === 'passed') return 'ทำได้ดีแล้วนะ ผู้เรียนตอบได้ผ่านเกณฑ์ตาม rubric แล้ว รอบต่อไปลองฝึกให้คำตอบกระชับ ชัดเจน และเป็นธรรมชาติเหมือนคุยกับผู้ป่วยจริง'
  return remainingAttempts > 0
    ? 'ยังไม่เป็นไรนะ ผู้เรียนมาถูกทางแล้ว ลองใช้คำแนะนำด้านบนเติมประเด็นให้ครบขึ้น แล้วส่งคำตอบอีกครั้งได้เลย'
    : 'รอบนี้ยังไม่ผ่าน แต่ถือว่าเป็นข้อมูลสำคัญสำหรับการฝึก ลองทบทวนเฉลยและนำไปปรับใช้กับสถานการณ์ถัดไปนะ'
}

export default function PracticeFeedbackPanel({
  lang,
  score,
  aiStatus,
  numericScore,
  maxScore,
  passScore,
  matchedElements,
  missingElements,
  baseReasoning,
  answerSections,
  modelAnswer,
  modelAnswerRevealed,
  remainingAttempts,
  showScoreHeader = true,
  compact = false,
}: PracticeFeedbackPanelProps) {
  const matched = matchedElements ?? []
  const missing = missingElements ?? []
  const sections = answerSections ?? []
  const resolvedNumericScore = numericScore ?? 0
  const resolvedMaxScore = maxScore ?? 0
  const resolvedPassScore = passScore ?? 0
  const resolvedRemainingAttempts = remainingAttempts ?? 0
  const detailedFeedback =
    aiStatus === 'failed'
      ? lang === 'th'
        ? 'ระบบไม่สามารถตรวจคำตอบได้ กรุณาลองใหม่'
        : 'The system could not complete the review.'
      : buildDetailedFeedback({
          lang,
          score,
          numericScore: resolvedNumericScore,
          maxScore: resolvedMaxScore,
          passScore: resolvedPassScore,
          matchedCount: matched.length,
          missingCount: missing.length,
          baseReasoning,
        })
  const closingFeedback = buildClosingFeedback({
    lang,
    score,
    remainingAttempts: resolvedRemainingAttempts,
  })

  const copy = {
    th: {
      score: 'คะแนน',
      passScore: 'เกณฑ์ผ่าน',
      summary: 'สรุป feedback',
      matched: 'ประเด็นที่ตรวจพบ',
      answers: 'คำตอบของผู้เรียน',
      noAnswer: 'ยังไม่ได้ตอบหัวข้อนี้',
      missing: 'ประเด็นที่ควรเพิ่ม',
      final: 'สรุปท้ายแบบฝึก',
      modelAnswer: 'เฉลยอ้างอิง',
    },
    en: {
      score: 'Score',
      passScore: 'Pass score',
      summary: 'Feedback summary',
      matched: 'Detected points',
      answers: 'Learner answers',
      noAnswer: 'No answer for this item yet.',
      missing: 'Points to improve',
      final: 'Final note',
      modelAnswer: 'Reference answer',
    },
  }[lang]

  return (
    <div
      className={`overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm ${
        compact ? 'text-sm' : ''
      }`}
    >
      <div
        className={`h-2 w-full ${
          score === 'correct'
            ? 'bg-green-600'
            : score === 'incorrect'
              ? 'bg-red-600'
              : 'bg-[#F5821F]'
        }`}
      />

      <div className={compact ? 'p-4' : 'p-5 sm:p-6'}>
        {showScoreHeader ? (
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold text-slate-950">
              {getScoreLabel(score, lang)}
            </h3>

            {resolvedMaxScore > 0 ? (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-900">
                {copy.score}: {resolvedNumericScore}/{resolvedMaxScore}
              </span>
            ) : null}

            {resolvedPassScore > 0 && resolvedMaxScore > 0 ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-bold text-slate-700">
                {copy.passScore}: {resolvedPassScore}/{resolvedMaxScore}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className={showScoreHeader ? 'mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4' : 'rounded-xl border border-slate-200 bg-slate-50 p-4'}>
          <p className="text-sm font-bold text-slate-950">{copy.summary}</p>
          <p className="mt-2 text-base leading-7 text-slate-800">
            {detailedFeedback}
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-bold text-green-950">{copy.matched}</p>
          {matched.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {matched.map((element) => (
                <span
                  key={element}
                  className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-bold text-green-900"
                >
                  {element}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <p className="text-sm font-bold text-green-950">{copy.answers}</p>
            {sections.length > 0 ? (
              sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border border-green-200 bg-white px-4 py-3"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-green-800">
                    {section.label}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800">
                    {section.answer || copy.noAnswer}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-slate-700">
                {copy.noAnswer}
              </p>
            )}
          </div>
        </div>

        {missing.length > 0 ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-950">{copy.missing}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {missing.map((element, index) => (
                <div
                  key={`${element}-${index}`}
                  className="rounded-xl border border-red-200 bg-white px-3 py-3 text-sm text-red-950"
                >
                  <p className="font-bold">
                    {index + 1}. {element}
                  </p>
                  <p className="mt-1 leading-6 text-red-900">
                    {getImprovementGuidance(element, lang)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-[#F5821F]/25 bg-[#FFF4E8] p-4">
          <p className="text-sm font-bold text-[#9A5200]">{copy.final}</p>
          <p className="mt-2 text-base leading-7 text-slate-900">
            {closingFeedback}
          </p>
        </div>

        {modelAnswerRevealed && modelAnswer ? (
          <div className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">
              {copy.modelAnswer}
            </p>
            <p className="mt-2 whitespace-pre-line text-base leading-7 text-slate-900">
              {modelAnswer}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
