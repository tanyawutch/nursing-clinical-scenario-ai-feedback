import { NextResponse } from 'next/server'
import { isAdminUser } from '@/utils/authUser'
import prisma from '@/utils/prisma'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import { createClient } from '@/utils/supabase/server'

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export async function GET() {
  const supabase = await createClient()
  const user = await getUserWithTimeout(supabase)

  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  if (!isAdminUser(user)) return new NextResponse('Forbidden', { status: 403 })

  const attempts = await prisma.attempt.findMany({
    include: {
      student: {
        select: { email: true, name: true, studentId: true },
      },
      scenario: {
        select: { title: true, scenarioKind: true },
      },
      attemptSteps: {
        include: {
          scenarioStep: {
            select: { order: true, title: true, maxScore: true, passScore: true },
          },
        },
        orderBy: { updatedAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'อีเมล',
    'ชื่อผู้เรียน',
    'รหัสผู้เรียน',
    'ประเภท',
    'สถานการณ์',
    'ข้อ',
    'หัวข้องาน',
    'คะแนน',
    'คะแนนเต็ม',
    'คะแนนผ่าน',
    'เวลาที่ใช้ (วินาที)',
    'เริ่มทำ',
    'ส่งเสร็จ',
    'สถานะ',
    'คำตอบ',
    'คำแนะนำจากระบบ',
    'ประเด็นที่ตรวจพบ',
    'ประเด็นที่ควรเพิ่ม',
  ]

  const rows = attempts.flatMap((attempt) => {
    const base = [
      attempt.student.email,
      attempt.student.name,
      attempt.student.studentId,
      attempt.scenario.scenarioKind === 'test' ? 'ทดสอบ' : 'แบบฝึกหัด',
      attempt.scenario.title,
    ]

    if (attempt.attemptSteps.length === 0) {
      return [
        [
          ...base,
          '',
          '',
          attempt.preTestScore ?? attempt.postTestScore ?? '',
          '',
          '',
          attempt.durationSeconds ?? '',
          attempt.startedAt.toISOString(),
          attempt.completedAt?.toISOString() ?? '',
          attempt.isCompleted ? 'เสร็จสิ้น' : 'กำลังทำ',
          [attempt.primaryDiagnosis, attempt.interventions].filter(Boolean).join('\n'),
          attempt.aiReasoning,
          '',
          attempt.aiMissingElements.join('\n'),
        ],
      ]
    }

    return attempt.attemptSteps.map((step) => [
      ...base,
      step.scenarioStep.order,
      step.scenarioStep.title,
      step.numericScore ?? '',
      step.maxScore ?? step.scenarioStep.maxScore,
      step.scenarioStep.passScore,
      attempt.durationSeconds ?? '',
      attempt.startedAt.toISOString(),
      attempt.completedAt?.toISOString() ?? '',
      attempt.isCompleted ? 'เสร็จสิ้น' : 'กำลังทำ',
      step.answer,
      step.aiReasoning,
      step.matchedElements.join('\n'),
      step.aiMissingElements.join('\n'),
    ])
  })

  const content = '\ufeff' + [headers, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pmc-wesmart-results-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
