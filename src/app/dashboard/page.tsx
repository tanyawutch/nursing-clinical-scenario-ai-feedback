import Link from 'next/link'
import { redirect } from 'next/navigation'
import prisma from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'

type ScenarioStatus = 'demo-ready' | 'content-planned' | 'pending-content'

type PlannedScenarioSlot = {
  slotId: string
  title: string
  bodySystem: string
  status: ScenarioStatus
  description: string
  scenarioId?: string
}

type BodySystemSection = {
  name: string
  subtitle: string
  slots: PlannedScenarioSlot[]
}

const plannedCurriculum: BodySystemSection[] = [
  {
    name: 'EENT',
    subtitle: 'Ear, eye, nose, and throat clinical cases',
    slots: [
      {
        slotId: 'eent-01',
        title: 'Allergic Rhinitis',
        bodySystem: 'EENT',
        status: 'content-planned',
        description:
          'Scenario title is planned. Full clinical content and feedback rubric are pending validation.',
      },
      {
        slotId: 'eent-02',
        title: 'Clinical case pending',
        bodySystem: 'EENT',
        status: 'pending-content',
        description:
          'This slot is reserved for the second EENT scenario after clinical content is provided.',
      },
    ],
  },
  {
    name: 'Respiratory System',
    subtitle: 'Respiratory assessment and primary care cases',
    slots: [
      {
        slotId: 'respiratory-01',
        title: 'Acute Bronchitis',
        bodySystem: 'Respiratory System',
        status: 'content-planned',
        description:
          'Scenario title is planned. Full clinical content and feedback rubric are pending validation.',
      },
      {
        slotId: 'respiratory-02',
        title: 'Clinical case pending',
        bodySystem: 'Respiratory System',
        status: 'pending-content',
        description:
          'This slot is reserved for the second respiratory scenario after clinical content is provided.',
      },
    ],
  },
  {
    name: 'Gastrointestinal System',
    subtitle: 'GI symptoms, assessment, and care planning',
    slots: [
      {
        slotId: 'gi-01',
        title: 'Gastritis',
        bodySystem: 'Gastrointestinal System',
        status: 'content-planned',
        description:
          'Scenario title is planned. Full clinical content and feedback rubric are pending validation.',
      },
      {
        slotId: 'gi-02',
        title: 'Clinical case pending',
        bodySystem: 'Gastrointestinal System',
        status: 'pending-content',
        description:
          'This slot is reserved for the second GI scenario after clinical content is provided.',
      },
    ],
  },
  {
    name: 'Musculoskeletal System',
    subtitle: 'Pain assessment, red flags, and referral decisions',
    slots: [
      {
        slotId: 'msk-01',
        title: 'Acute Lower Back Pain',
        bodySystem: 'Musculoskeletal System',
        status: 'demo-ready',
        description:
          'Fully working demo scenario with step-by-step practice, final assessment, and AI-supported feedback.',
        scenarioId: 'back-pain-scenario-001',
      },
      {
        slotId: 'msk-02',
        title: 'Clinical case pending',
        bodySystem: 'Musculoskeletal System',
        status: 'pending-content',
        description:
          'This slot is reserved for the second musculoskeletal scenario after clinical content is provided.',
      },
    ],
  },
  {
    name: 'Urinary / Reproductive System',
    subtitle: 'Primary care cases related to urinary and reproductive health',
    slots: [
      {
        slotId: 'urinary-reproductive-01',
        title: 'Clinical case pending',
        bodySystem: 'Urinary / Reproductive System',
        status: 'pending-content',
        description:
          'This slot is reserved for the first urinary or reproductive scenario after clinical content is provided.',
      },
      {
        slotId: 'urinary-reproductive-02',
        title: 'Clinical case pending',
        bodySystem: 'Urinary / Reproductive System',
        status: 'pending-content',
        description:
          'This slot is reserved for the second urinary or reproductive scenario after clinical content is provided.',
      },
    ],
  },
  {
    name: 'Fever / Skin Conditions',
    subtitle: 'Fever and skin condition scenarios for clinical reasoning',
    slots: [
      {
        slotId: 'fever-skin-01',
        title: 'Clinical case pending',
        bodySystem: 'Fever / Skin Conditions',
        status: 'pending-content',
        description:
          'This slot is reserved for the first fever or skin condition scenario after clinical content is provided.',
      },
      {
        slotId: 'fever-skin-02',
        title: 'Clinical case pending',
        bodySystem: 'Fever / Skin Conditions',
        status: 'pending-content',
        description:
          'This slot is reserved for the second fever or skin condition scenario after clinical content is provided.',
      },
    ],
  },
]

function getStatusContent(status: ScenarioStatus) {
  if (status === 'demo-ready') {
    return {
      label: 'Demo Ready',
      badgeClass: 'border-green-200 bg-green-50 text-green-700',
      dotClass: 'bg-green-600',
      ringClass: 'ring-green-100',
      buttonLabel: 'Start Practice',
      practiceText: 'Step-by-step response with final assessment feedback',
    }
  }

  if (status === 'content-planned') {
    return {
      label: 'Content Planned',
      badgeClass: 'border-blue-200 bg-blue-50 text-blue-800',
      dotClass: 'bg-blue-600',
      ringClass: 'ring-blue-100',
      buttonLabel: 'Coming Soon',
      practiceText: 'Scenario title is prepared; clinical rubric is pending',
    }
  }

  return {
    label: 'Pending Content',
    badgeClass: 'border-rose-200 bg-rose-50 text-[#A73535]',
    dotClass: 'bg-[#A73535]',
    ringClass: 'ring-rose-100',
    buttonLabel: 'Awaiting Content',
    practiceText: 'Clinical content must be validated before practice is enabled',
  }
}

function getSectionSummary(slots: PlannedScenarioSlot[]) {
  return {
    ready: slots.filter((slot) => slot.status === 'demo-ready').length,
    planned: slots.filter((slot) => slot.status === 'content-planned').length,
    pending: slots.filter((slot) => slot.status === 'pending-content').length,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const studentId = user.email?.split('@')[0] ?? 'Student'

  const scenarios = await prisma.scenario.findMany({
    orderBy: {
      title: 'asc',
    },
  })

  const scenarioById = new Map(
    scenarios.map((scenario) => [scenario.id, scenario]),
  )

  const backPainScenario = scenarioById.get('back-pain-scenario-001')
  const allSlots = plannedCurriculum.flatMap((section) => section.slots)
  const plannedScenarioCount = allSlots.length
  const bodySystemCount = plannedCurriculum.length
  const readyDemoCount = allSlots.filter(
    (slot) => slot.status === 'demo-ready',
  ).length

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8C1515] shadow-sm">
              <span className="text-xs font-bold tracking-wide text-white">
                MFU
              </span>
            </div>

            <div>
              <h1 className="text-base font-bold text-slate-950 sm:text-lg">
                Clinical Scenario Learning
              </h1>
              <p className="hidden text-xs font-medium text-slate-600 sm:block">
                Guided clinical practice with AI-supported feedback
              </p>
            </div>
          </div>

          <span className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 sm:text-sm">
            ID: {studentId}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="px-6 py-8 sm:px-8 lg:px-10">
              <span className="inline-flex items-center rounded-full border border-[#8C1515]/15 bg-[#fff5f5] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[#8C1515]">
                Primary Medical Care
              </span>

              <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Practice clinical reasoning through guided patient cases.
              </h2>

              <p className="mt-4 max-w-3xl text-base font-normal leading-8 text-slate-700">
                This platform supports nursing students through scenario-based
                practice, step-by-step clinical reasoning, and structured
                feedback. The current working demo focuses on a validated Back
                Pain scenario while the full curriculum is planned for twelve
                clinical scenarios.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-2xl font-bold text-slate-950">
                    {readyDemoCount}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Ready demo
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-2xl font-bold text-slate-950">
                    {plannedScenarioCount}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Planned scenarios
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-2xl font-bold text-slate-950">
                    {bodySystemCount}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Body systems
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-8 sm:px-8 lg:border-l lg:border-t-0 lg:px-10">
              <div className="flex h-full flex-col justify-between gap-7">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3.5 py-1.5 text-xs font-bold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    Featured Demo Scenario
                  </div>

                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                    Acute Lower Back Pain
                  </h3>

                  <p className="mt-3 text-sm font-normal leading-7 text-slate-700">
                    A validated musculoskeletal case for practicing pain
                    assessment, red flag screening, initial nursing advice, and
                    referral decision-making.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-950">
                    Current learning path
                  </p>
                  <p className="mt-2 text-sm font-normal leading-7 text-slate-700">
                    Start with guided practice, then submit a complete final
                    assessment to receive structured feedback.
                  </p>

                  {backPainScenario ? (
                    <Link
                      href={`/dashboard/scenario/${backPainScenario.id}`}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#8C1515] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#741111] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#8C1515] focus:ring-offset-2"
                    >
                      Resume Back Pain Practice
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
                    >
                      Demo scenario not seeded
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Scenario Learning Modules
              </h2>
              <p className="mt-1.5 text-sm font-normal leading-6 text-slate-700">
                Twelve planned scenario slots are organized into six clinical
                modules. Only validated content is enabled for practice.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                Demo Ready
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Content Planned
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#A73535]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#A73535]" />
                Pending Content
              </span>
            </div>
          </div>

          <div className="space-y-7">
            {plannedCurriculum.map((section, sectionIndex) => {
              const summary = getSectionSummary(section.slots)
              const moduleNumber = String(sectionIndex + 1).padStart(2, '0')

              return (
                <section
                  key={section.name}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#8C1515] shadow-sm">
                          <span className="text-base font-bold text-white">
                            {moduleNumber}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-bold uppercase tracking-normal text-[#8C1515]">
                            Clinical Module
                          </p>
                          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                            {section.name}
                          </h3>
                          <p className="mt-1.5 max-w-2xl text-sm font-normal leading-6 text-slate-700">
                            {section.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                          2 scenario slots
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                          {summary.ready} ready
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          {summary.planned} planned
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#A73535]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#A73535]" />
                          {summary.pending} pending
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
                    {section.slots.map((slot, slotIndex) => {
                      const status = getStatusContent(slot.status)
                      const linkedScenario = slot.scenarioId
                        ? scenarioById.get(slot.scenarioId)
                        : null
                      const isReady =
                        slot.status === 'demo-ready' && Boolean(linkedScenario)
                      const caseNumber = String(slotIndex + 1).padStart(2, '0')

                      return (
                        <article
                          key={slot.slotId}
                          className={`group flex min-h-[265px] flex-col rounded-2xl border bg-white p-5 shadow-sm ring-4 ring-transparent transition-all ${
                            isReady
                              ? `border-green-200 hover:-translate-y-0.5 hover:shadow-md ${status.ringClass}`
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-[12px] font-bold text-slate-700">
                              Case {caseNumber}
                            </span>

                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${status.badgeClass}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`}
                              />
                              {status.label}
                            </span>
                          </div>

                          <h4 className="text-xl font-bold tracking-tight text-slate-950">
                            {slot.title}
                          </h4>

                          <p className="mt-3 flex-1 text-[15px] font-normal leading-7 text-slate-700">
                            {linkedScenario?.description ?? slot.description}
                          </p>

                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[12px] font-bold uppercase tracking-normal text-slate-600">
                                Practice mode
                              </p>
                              <span className="text-xs font-bold text-slate-500">
                                {section.name}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-800">
                              {isReady
                                ? status.practiceText
                                : status.practiceText}
                            </p>
                          </div>

                          {isReady && linkedScenario ? (
                            <Link
                              href={`/dashboard/scenario/${linkedScenario.id}`}
                              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#8C1515] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#741111] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#8C1515] focus:ring-offset-2"
                            >
                              {status.buttonLabel}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600"
                            >
                              {status.buttonLabel}
                            </button>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-950">Curriculum note</p>
            <p className="mt-2 text-sm font-normal leading-7 text-slate-700">
              The dashboard is structured for twelve planned scenarios across
              six clinical modules. Only the validated Back Pain demo is
              currently enabled. Additional scenarios will be activated after
              clinical content, rubrics, and feedback rules are confirmed.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}