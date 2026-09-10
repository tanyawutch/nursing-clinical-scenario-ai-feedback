'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Activity,
  Award,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Lock,
  Play,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Thermometer,
  Unlock,
  User,
  Users,
  Wind,
  X,
} from 'lucide-react'
import LanguageToggle from '@/app/components/LanguageToggle'
import LogoutButton from '@/app/components/LogoutButton'
import { toggleScenarioAvailability } from './actions'

type PageLanguage = 'th' | 'en'
type ScenarioKind = 'test' | 'exercise'

type ScenarioCard = {
  id: string
  kind: ScenarioKind
  systemKey: string
  systemNumber: number
  titleTh: string
  titleEn: string
  subtitleTh: string
  subtitleEn: string
  descriptionTh: string
  descriptionEn: string
  isEnabled: boolean
  totalPoints: number
}

type DashboardClientProps = {
  lang: PageLanguage
  studentLabel: string
  isAdmin: boolean
  scenarios: ScenarioCard[]
}

const systemIcons = {
  fever: Thermometer,
  respiratory: Wind,
  musculoskeletal: Activity,
  urinary: Stethoscope,
}

function getSystemIcon(systemKey: string) {
  return systemIcons[systemKey as keyof typeof systemIcons] ?? BookOpen
}

function getScenarioRoute(id: string, lang: PageLanguage) {
  return `/dashboard/scenario/${id}?lang=${lang}`
}

export default function DashboardClient({
  lang,
  studentLabel,
  isAdmin,
  scenarios,
}: DashboardClientProps) {
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<ScenarioCard | null>(
    null
  )
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const copy = {
    th: {
      appTitle: 'PMC WeSmart',
      appSubtitle: 'ระบบฝึกทักษะการซักประวัติผู้ป่วยผ่านสถานการณ์จำลอง',
      heroLabel: 'Primary Medical Care Practicum',
      heroTitle: 'ศูนย์การเรียนรู้และประเมินทักษะทางคลินิก',
      heroBody:
        'เลือกทำแบบทดสอบหรือแบบฝึกหัดตามสถานการณ์ที่ผู้สอนเปิดให้เข้าทำ',
      adminToggleBtn: 'แผงผู้สอน',
      adminTitle: 'ระบบเปิด-ปิดบทเรียนสำหรับผู้สอน',
      adminDesc:
        'ผู้สอนสามารถเปิดหรือปิดการเข้าถึงแบบทดสอบและแบบฝึกหัดได้ทันที',
      testTrackLabel: 'แทร็กแบบทดสอบ',
      practiceTrackLabel: 'แทร็กแบบฝึกหัด',
      openStatus: 'เปิดระบบ',
      closedStatus: 'ปิดระบบ',
      startTest: 'เข้าทำแบบทดสอบ',
      startPractice: 'เข้าทำแบบฝึกหัด',
      lockedText: 'ยังไม่เปิดให้ทำ',
      lockTooltip: 'บทเรียนนี้ยังไม่เปิดให้เข้าทำ โปรดรอผู้สอนเปิดระบบ',
      timeLimit: 'ระยะเวลา',
      totalPoints: 'คะแนนเต็ม',
      rubricNotice: 'ประเมินผลตามเกณฑ์ Rubric 5 งานหลัก',
      confirmStart: 'ยืนยันเริ่มทำบทเรียน',
      closeModal: 'ปิดหน้าต่าง',
      noLimit: 'ไม่จำกัดเวลา',
      testTime: '30 นาที',
      enabled: 'พร้อมเข้าทำ',
      opened: 'เปิด',
      profile: 'ประวัติ',
      users: 'ผู้ใช้งาน',
    },
    en: {
      appTitle: 'PMC WeSmart',
      appSubtitle: 'Patient History Taking & Clinical Scenario Simulation',
      heroLabel: 'Primary Medical Care Practicum',
      heroTitle: 'Clinical Scenario & Assessment Hub',
      heroBody:
        'Select enabled test or practice stations authorized by your instructor.',
      adminToggleBtn: 'Instructor Panel',
      adminTitle: 'Module Access Control',
      adminDesc: 'Toggle availability for tests and practices in real time.',
      testTrackLabel: 'Test Track',
      practiceTrackLabel: 'Practice Track',
      openStatus: 'Available',
      closedStatus: 'Locked',
      startTest: 'Start Test',
      startPractice: 'Start Practice',
      lockedText: 'Locked',
      lockTooltip: 'This station is locked by instructor.',
      timeLimit: 'Time Limit',
      totalPoints: 'Max Score',
      rubricNotice: 'Evaluated against 5 core clinical rubric tasks',
      confirmStart: 'Begin Station',
      closeModal: 'Close',
      noLimit: 'No limit',
      testTime: '30 min',
      enabled: 'Ready',
      opened: 'open',
      profile: 'History',
      users: 'Users',
    },
  }[lang]

  const testScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.kind === 'test'),
    [scenarios]
  )
  const practiceScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.kind === 'exercise'),
    [scenarios]
  )
  const totalOpenTests = testScenarios.filter(
    (scenario) => scenario.isEnabled
  ).length
  const totalOpenPractices = practiceScenarios.filter(
    (scenario) => scenario.isEnabled
  ).length
  const systems = useMemo(() => {
    const unique = new Map<string, ScenarioCard>()
    scenarios.forEach((scenario) => {
      if (!unique.has(scenario.systemKey)) {
        unique.set(scenario.systemKey, scenario)
      }
    })

    return Array.from(unique.values())
  }, [scenarios])

  function showLockedNotice() {
    setToastMessage(copy.lockTooltip)
    window.setTimeout(() => setToastMessage(null), 3000)
  }

  function TrackPanel({
    type,
    items,
  }: {
    type: ScenarioKind
    items: ScenarioCard[]
  }) {
    const isTest = type === 'test'
    const panelClass = isTest
      ? 'border-blue-200 bg-blue-50/30'
      : 'border-emerald-200 bg-emerald-50/30'
    const iconClass = isTest ? 'bg-blue-600' : 'bg-emerald-600'
    const label = isTest ? copy.testTrackLabel : copy.practiceTrackLabel
    const totalOpen = isTest ? totalOpenTests : totalOpenPractices

    return (
      <section
        className={`flex min-h-[520px] flex-col rounded-2xl border p-4 shadow-sm ${panelClass}`}
      >
        <div
          className={`mb-3 flex items-center justify-between border-b pb-2.5 ${
            isTest ? 'border-blue-100' : 'border-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm ${iconClass}`}
            >
              {isTest ? (
                <Award className="h-4 w-4" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
            </span>
            <div>
              <h2 className="text-sm font-black tracking-wide text-slate-900">
                {label}
              </h2>
              <p
                className={`text-[11px] font-semibold ${
                  isTest ? 'text-blue-700' : 'text-emerald-700'
                }`}
              >
                {isTest
                  ? lang === 'th'
                    ? 'แบบวัดผลสมรรถนะ'
                    : 'Competency assessment'
                  : lang === 'th'
                    ? 'ฝึกฝนซ้ำและรับ feedback'
                    : 'Repeat practice with feedback'}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
              isTest
                ? 'border-blue-200 bg-blue-100 text-blue-800'
                : 'border-emerald-200 bg-emerald-100 text-emerald-800'
            }`}
          >
            {totalOpen}/4 {copy.opened}
          </span>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((scenario) => {
            const SystemIcon = getSystemIcon(scenario.systemKey)
            const isOpen = scenario.isEnabled
            const accent = isTest ? 'blue' : 'emerald'
            const title = lang === 'th' ? scenario.titleTh : scenario.titleEn
            const subtitle =
              lang === 'th' ? scenario.subtitleTh : scenario.subtitleEn

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() =>
                  isOpen ? setSelectedScenario(scenario) : showLockedNotice()
                }
                className={`relative flex min-h-[210px] flex-col justify-between rounded-xl border p-4 text-left transition ${
                  isOpen
                    ? accent === 'blue'
                      ? 'cursor-pointer border-blue-300 bg-white hover:border-blue-500 hover:shadow-md'
                      : 'cursor-pointer border-emerald-300 bg-white hover:border-emerald-500 hover:shadow-md'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-2xl font-black ${
                      isOpen
                        ? accent === 'blue'
                          ? 'text-blue-600'
                          : 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {String(scenario.systemNumber).padStart(2, '0')}
                  </span>
                  <span
                    className={`rounded-lg p-2 ${
                      isOpen
                        ? accent === 'blue'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <SystemIcon className="h-4 w-4" />
                  </span>
                </div>

                <div className="my-3">
                  <h3 className="text-sm font-black text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-600">
                    {subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                  {isOpen ? (
                    <>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <Unlock className="h-3 w-3" />
                        {copy.openStatus}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          accent === 'blue' ? 'text-blue-600' : 'text-emerald-600'
                        }`}
                      >
                        {isTest ? copy.startTest : copy.startPractice}
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-400">
                        <Lock className="h-3 w-3" />
                        {copy.closedStatus}
                      </span>
                      <span className="text-slate-400">{copy.lockedText}</span>
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800">
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      ) : null}

      <header className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5821F] text-xs font-black text-white shadow-md shadow-[#F5821F]/20">
              MFU
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900">
                  {copy.appTitle}
                </h1>
                <span className="rounded-md border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-[#F5821F]">
                  v2.0
                </span>
              </div>
              <p className="line-clamp-1 text-[11px] font-medium text-slate-500">
                {copy.appSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin ? (
              <>
                <Link
                  href={`/dashboard/users?lang=${lang}`}
                  className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#F5821F]/40 hover:bg-orange-50 hover:text-[#F5821F] md:flex"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{copy.users}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAdminPanel((value) => !value)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                    showAdminPanel
                      ? 'border-purple-300 bg-purple-600 text-white shadow-purple-600/20'
                      : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>{copy.adminToggleBtn}</span>
                </button>
              </>
            ) : null}

            <Link
              href={`/dashboard/history?lang=${lang}`}
              className="hidden items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#F5821F] sm:flex"
            >
              <User className="h-3.5 w-3.5" />
              <span>{studentLabel}</span>
            </Link>

            <LanguageToggle lang={lang} pathname="/dashboard" />
            <LogoutButton lang={lang} />
          </div>
        </div>
      </header>

      {isAdmin && showAdminPanel ? (
        <section className="shrink-0 border-b border-purple-200 bg-purple-50/95 px-4 py-3.5 text-slate-800 shadow-md lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-purple-600" />
                <div>
                  <h2 className="text-xs font-black text-purple-900">
                    {copy.adminTitle}
                  </h2>
                  <p className="text-[11px] font-medium text-purple-700">
                    {copy.adminDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminPanel(false)}
                className="rounded-lg bg-purple-200/80 px-2 py-1 text-[11px] font-bold text-purple-800 transition hover:bg-purple-300"
              >
                x
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {systems.map((system) => {
                const test = testScenarios.find(
                  (scenario) => scenario.systemKey === system.systemKey
                )
                const practice = practiceScenarios.find(
                  (scenario) => scenario.systemKey === system.systemKey
                )

                return (
                  <div
                    key={system.systemKey}
                    className="rounded-xl border border-purple-200 bg-white p-3 shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-1.5 border-b border-purple-100 pb-2 text-[11px] font-bold text-slate-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-600 text-[10px] font-black text-white">
                        {system.systemNumber}
                      </span>
                      <span className="truncate">
                        {lang === 'th' ? system.titleTh : system.titleEn}
                      </span>
                    </div>

                    {[test, practice].filter(Boolean).map((scenario) => (
                      <form
                        key={scenario!.id}
                        action={toggleScenarioAvailability}
                        className="flex items-center justify-between py-1"
                      >
                        <input type="hidden" name="scenarioId" value={scenario!.id} />
                        <input
                          type="hidden"
                          name="nextEnabled"
                          value={String(!scenario!.isEnabled)}
                        />
                        <input type="hidden" name="lang" value={lang} />
                        <span className="text-[11px] font-medium text-slate-600">
                          {scenario!.kind === 'test'
                            ? lang === 'th'
                              ? 'แบบทดสอบ'
                              : 'Test'
                            : lang === 'th'
                              ? 'แบบฝึกหัด'
                              : 'Practice'}
                        </span>
                        <button
                          type="submit"
                          className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition ${
                            scenario!.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          aria-label="Toggle scenario"
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition ${
                              scenario!.isEnabled
                                ? 'translate-x-5'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </form>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F5821F]/10 blur-2xl" />

            <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-[#F5821F]">
                  <Sparkles className="h-3 w-3" />
                  <span>{copy.heroLabel}</span>
                </div>
                <h2 className="mt-2 text-lg font-black tracking-tight text-slate-900 lg:text-xl">
                  {copy.heroTitle}
                </h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">
                  {copy.heroBody}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="min-w-[110px] rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    {copy.testTrackLabel}
                  </div>
                  <div className="mt-0.5 text-lg font-black text-slate-900">
                    {totalOpenTests}{' '}
                    <span className="text-[10px] font-semibold text-slate-500">
                      / 4 {copy.opened}
                    </span>
                  </div>
                </div>
                <div className="min-w-[110px] rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    {copy.practiceTrackLabel}
                  </div>
                  <div className="mt-0.5 text-lg font-black text-slate-900">
                    {totalOpenPractices}{' '}
                    <span className="text-[10px] font-semibold text-slate-500">
                      / 4 {copy.opened}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrackPanel type="test" items={testScenarios} />
            <TrackPanel type="exercise" items={practiceScenarios} />
          </div>
        </div>
      </main>

      {selectedScenario ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedScenario(null)}
              className="absolute right-5 top-5 rounded-lg bg-slate-100 p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${
                  selectedScenario.kind === 'test'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {selectedScenario.kind === 'test' ? (
                  <Award className="h-3.5 w-3.5" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5" />
                )}
                {selectedScenario.kind === 'test'
                  ? copy.testTrackLabel
                  : copy.practiceTrackLabel}{' '}
                #{selectedScenario.systemNumber}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900">
              {selectedScenario.kind === 'test'
                ? lang === 'th'
                  ? 'สถานการณ์ทดสอบ'
                  : 'Test Scenario'
                : lang === 'th'
                  ? 'สถานการณ์จำลอง'
                  : 'Practice Scenario'}
            </h3>

            <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">
              {lang === 'th'
                ? selectedScenario.descriptionTh
                : selectedScenario.descriptionEn}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Clock className="h-4 w-4 text-[#F5821F]" />
                <div>
                  <div className="text-[10px] text-slate-400">
                    {copy.timeLimit}
                  </div>
                  <div className="font-bold text-slate-800">
                    {selectedScenario.kind === 'test' ? copy.testTime : copy.noLimit}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <div>
                  <div className="text-[10px] text-slate-400">
                    {copy.totalPoints}
                  </div>
                  <div className="font-bold text-slate-800">
                    {selectedScenario.totalPoints}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] text-slate-600">
              <FileText className="h-4 w-4 shrink-0 text-blue-600" />
              <span>{copy.rubricNotice}</span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Link
                href={getScenarioRoute(selectedScenario.id, lang)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black text-white shadow-md transition active:scale-[0.98] ${
                  selectedScenario.kind === 'test'
                    ? 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'
                    : 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'
                }`}
              >
                <Play className="h-4 w-4 fill-white" />
                <span>{copy.confirmStart}</span>
              </Link>

              <button
                type="button"
                onClick={() => setSelectedScenario(null)}
                className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                {copy.closeModal}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="shrink-0 border-t border-slate-200 bg-white py-2 text-center text-[11px] text-slate-500">
        <p>© 2026 PMC WeSmart - School of Nursing, Mae Fah Luang University.</p>
      </footer>
    </div>
  )
}
