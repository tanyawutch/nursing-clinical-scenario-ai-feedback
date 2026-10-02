'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock } from 'lucide-react'

type PageLanguage = 'th' | 'en'

type AttemptTimerProps = {
  lang: PageLanguage
  startedAt: string | null
  completedAt?: string | null
  timeLimitSeconds: number
}

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function AttemptTimer({
  lang,
  startedAt,
  completedAt,
  timeLimitSeconds,
}: AttemptTimerProps) {
  const startedAtMs = useMemo(
    () => (startedAt ? new Date(startedAt).getTime() : null),
    [startedAt]
  )
  const completedAtMs = useMemo(
    () => (completedAt ? new Date(completedAt).getTime() : null),
    [completedAt]
  )
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!startedAtMs || completedAtMs) return

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [completedAtMs, startedAtMs])

  if (!startedAtMs) return null

  const endMs = completedAtMs ?? now
  const elapsedSeconds = Math.max(Math.floor((endMs - startedAtMs) / 1000), 0)
  const remainingSeconds = timeLimitSeconds - elapsedSeconds
  const isOverLimit = remainingSeconds < 0

  const copy = {
    th: {
      label: completedAtMs ? 'เวลาที่ใช้' : 'เวลาสอบ',
      remaining: 'เหลือ',
      over: 'เกินเวลา',
      limit: 'ต้องไม่เกิน 30 นาที',
    },
    en: {
      label: completedAtMs ? 'Duration' : 'Test timer',
      remaining: 'Left',
      over: 'Over limit',
      limit: 'Must finish within 30 minutes',
    },
  }[lang]

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black shadow-sm ${
        isOverLimit
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-blue-200 bg-blue-50 text-blue-700'
      }`}
    >
      <Clock className="h-4 w-4" />
      <span>{copy.label}</span>
      <span className="rounded-full bg-white px-2 py-1 tabular-nums">
        {completedAtMs
          ? formatClock(elapsedSeconds)
          : `${copy.remaining} ${formatClock(remainingSeconds)}`}
      </span>
      <span className={isOverLimit ? 'text-red-700' : 'text-blue-600'}>
        {isOverLimit ? copy.over : copy.limit}
      </span>
    </div>
  )
}
