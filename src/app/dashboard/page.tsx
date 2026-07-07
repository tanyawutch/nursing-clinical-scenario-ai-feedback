import Link from 'next/link'
import { redirect } from 'next/navigation'
import LanguageToggle from '@/app/components/LanguageToggle'
import LogoutButton from '@/app/components/LogoutButton'
import prisma from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'

type PageLanguage = 'th' | 'en'
type ScenarioStatus = 'demo-ready' | 'content-planned' | 'pending-content'

type PlannedScenarioSlot = {
  slotId: string
  titleTh: string
  titleEn: string
  bodySystem: string
  status: ScenarioStatus
  descriptionTh: string
  descriptionEn: string
  scenarioId?: string
}

type BodySystemSection = {
  nameTh: string
  nameEn: string
  subtitleTh: string
  subtitleEn: string
  slots: PlannedScenarioSlot[]
}

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
}

const plannedCurriculum: BodySystemSection[] = [
  {
    nameTh: 'หู ตา จมูก คอ',
    nameEn: 'EENT',
    subtitleTh: 'กรณีศึกษาทางคลินิกของระบบหู ตา จมูก และคอ',
    subtitleEn: 'Ear, eye, nose, and throat clinical cases',
    slots: [
      {
        slotId: 'eent-01',
        titleTh: 'Allergic Rhinitis',
        titleEn: 'Allergic Rhinitis',
        bodySystem: 'EENT',
        status: 'content-planned',
        descriptionTh: 'เตรียมชื่อสถานการณ์แล้ว รอเนื้อหาและ rubric ที่ผ่านการตรวจสอบ',
        descriptionEn: 'Scenario title is planned. Full clinical content and rubric are pending validation.',
      },
      {
        slotId: 'eent-02',
        titleTh: 'รอเพิ่มกรณีศึกษา',
        titleEn: 'Clinical case pending',
        bodySystem: 'EENT',
        status: 'pending-content',
        descriptionTh: 'รอข้อมูลกรณีศึกษาที่สองของระบบนี้',
        descriptionEn: 'This slot is reserved for the second EENT scenario.',
      },
    ],
  },
  {
    nameTh: 'ระบบทางเดินหายใจ',
    nameEn: 'Respiratory System',
    subtitleTh: 'การประเมินและดูแลผู้ป่วยระบบทางเดินหายใจ',
    subtitleEn: 'Respiratory assessment and primary care cases',
    slots: [
      {
        slotId: 'respiratory-01',
        titleTh: 'Acute Bronchitis',
        titleEn: 'Acute Bronchitis',
        bodySystem: 'Respiratory System',
        status: 'content-planned',
        descriptionTh: 'เตรียมชื่อสถานการณ์แล้ว รอเนื้อหาและ rubric ที่ผ่านการตรวจสอบ',
        descriptionEn: 'Scenario title is planned. Full clinical content and rubric are pending validation.',
      },
      {
        slotId: 'respiratory-02',
        titleTh: 'รอเพิ่มกรณีศึกษา',
        titleEn: 'Clinical case pending',
        bodySystem: 'Respiratory System',
        status: 'pending-content',
        descriptionTh: 'รอข้อมูลกรณีศึกษาที่สองของระบบนี้',
        descriptionEn: 'This slot is reserved for the second respiratory scenario.',
      },
    ],
  },
  {
    nameTh: 'ระบบทางเดินอาหาร',
    nameEn: 'Gastrointestinal System',
    subtitleTh: 'อาการทาง GI การประเมิน และการวางแผนดูแล',
    subtitleEn: 'GI symptoms, assessment, and care planning',
    slots: [
      {
        slotId: 'gi-01',
        titleTh: 'Gastritis',
        titleEn: 'Gastritis',
        bodySystem: 'Gastrointestinal System',
        status: 'content-planned',
        descriptionTh: 'เตรียมชื่อสถานการณ์แล้ว รอเนื้อหาและ rubric ที่ผ่านการตรวจสอบ',
        descriptionEn: 'Scenario title is planned. Full clinical content and rubric are pending validation.',
      },
      {
        slotId: 'gi-02',
        titleTh: 'รอเพิ่มกรณีศึกษา',
        titleEn: 'Clinical case pending',
        bodySystem: 'Gastrointestinal System',
        status: 'pending-content',
        descriptionTh: 'รอข้อมูลกรณีศึกษาที่สองของระบบนี้',
        descriptionEn: 'This slot is reserved for the second GI scenario.',
      },
    ],
  },
  {
    nameTh: 'ระบบกระดูกและกล้ามเนื้อ',
    nameEn: 'Musculoskeletal System',
    subtitleTh: 'การประเมินปวดหลัง red flags การวินิจฉัยแยกโรค และการดูแล',
    subtitleEn: 'Pain assessment, red flags, differential diagnosis, and care planning',
    slots: [
      {
        slotId: 'msk-01',
        titleTh: 'อาการปวดหลังเฉียบพลัน',
        titleEn: 'Acute Lower Back Pain',
        bodySystem: 'Musculoskeletal System',
        status: 'demo-ready',
        descriptionTh: 'สถานการณ์พร้อมใช้งานตามเอกสาร V2 Scenario Back pain พร้อม rubric 5 งาน',
        descriptionEn: 'Validated Back Pain scenario with five rubric tasks from the V2 document.',
        scenarioId: 'back-pain-scenario-001',
      },
      {
        slotId: 'msk-02',
        titleTh: 'รอเพิ่มกรณีศึกษา',
        titleEn: 'Clinical case pending',
        bodySystem: 'Musculoskeletal System',
        status: 'pending-content',
        descriptionTh: 'รอข้อมูลกรณีศึกษาที่สองของระบบนี้',
        descriptionEn: 'This slot is reserved for the second musculoskeletal scenario.',
      },
    ],
  },
]

function getStatusContent(status: ScenarioStatus, lang: PageLanguage) {
  if (status === 'demo-ready') {
    return {
      label: lang === 'th' ? 'พร้อมใช้งาน' : 'Ready',
      buttonLabel: lang === 'th' ? 'เริ่มทำแบบฝึก' : 'Start Practice',
      badgeClass: 'border-green-200 bg-green-50 text-green-700',
      dotClass: 'bg-green-600',
    }
  }

  if (status === 'content-planned') {
    return {
      label: lang === 'th' ? 'วางแผนเนื้อหาแล้ว' : 'Content Planned',
      buttonLabel: lang === 'th' ? 'เร็ว ๆ นี้' : 'Coming Soon',
      badgeClass: 'border-blue-200 bg-blue-50 text-blue-800',
      dotClass: 'bg-blue-600',
    }
  }

  return {
    label: lang === 'th' ? 'รอเนื้อหา' : 'Pending Content',
    buttonLabel: lang === 'th' ? 'รอข้อมูล' : 'Awaiting Content',
    badgeClass: 'border-rose-200 bg-rose-50 text-[#F5821F]',
    dotClass: 'bg-[#F5821F]',
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const lang = resolveLanguage(resolvedSearchParams.lang)
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
    scenarios.map((scenario) => [scenario.id, scenario])
  )
  const allSlots = plannedCurriculum.flatMap((section) => section.slots)
  const readyDemoCount = allSlots.filter(
    (slot) => slot.status === 'demo-ready'
  ).length

  const copy = {
    th: {
      appTitle: 'ระบบฝึกสถานการณ์ทางคลินิก',
      appSubtitle: 'ฝึกคิดวิเคราะห์ทางคลินิกพร้อม feedback ตาม rubric',
      heroLabel: 'Primary Medical Care',
      heroTitle: 'ฝึกดูแลผู้ป่วยผ่านสถานการณ์จำลองตามเอกสารการประเมิน',
      heroBody:
        'ระบบนี้ช่วยให้นักศึกษาพยาบาลฝึกซักประวัติ วินิจฉัยแยกโรค วางแผนตรวจ รักษา ให้การพยาบาล และให้คำแนะนำผู้ป่วย โดยสถานการณ์ปวดหลังถูกปรับตามเอกสาร V2 Scenario Back pain แล้ว',
      ready: 'พร้อมใช้งาน',
      planned: 'สถานการณ์ที่วางแผน',
      systems: 'ระบบร่างกาย',
      featured: 'สถานการณ์เด่น',
      path: 'เส้นทางการเรียนรู้',
      pathBody: 'ทำแบบฝึก 5 งานตาม rubric และรับ feedback พร้อมคะแนน',
      modules: 'โมดูลสถานการณ์',
      modulesBody: 'สถานการณ์ถูกจัดตามระบบร่างกาย เปิดเฉพาะเนื้อหาที่ผ่านการตรวจสอบแล้ว',
      caseLabel: 'กรณีที่',
    },
    en: {
      appTitle: 'Clinical Scenario Learning',
      appSubtitle: 'Guided clinical practice with rubric-based feedback',
      heroLabel: 'Primary Medical Care',
      heroTitle: 'Practice patient care through document-based clinical scenarios',
      heroBody:
        'This platform supports nursing students through history taking, differential diagnosis, investigation planning, treatment, nursing care, and patient education. The Back Pain scenario now follows the V2 document rubric.',
      ready: 'Ready demo',
      planned: 'Planned scenarios',
      systems: 'Body systems',
      featured: 'Featured scenario',
      path: 'Current learning path',
      pathBody: 'Complete five rubric tasks and receive score-based feedback.',
      modules: 'Scenario Modules',
      modulesBody: 'Scenarios are organized by body system. Only validated content is enabled.',
      caseLabel: 'Case',
    },
  }[lang]

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5821F] shadow-sm">
              <span className="text-xs font-bold tracking-wide text-white">
                MFU
              </span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-950 sm:text-lg">
                {copy.appTitle}
              </h1>
              <p className="hidden text-xs font-medium text-slate-600 sm:block">
                {copy.appSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/history?lang=${lang}`}
              className="rounded-full border border-[#F5821F]/25 bg-[#FFF4E8] px-3.5 py-1.5 text-xs font-bold text-[#F5821F] transition hover:border-[#F5821F]/50 hover:bg-white sm:text-sm"
            >
              ID: {studentId}
            </Link>
            <LanguageToggle lang={lang} pathname="/dashboard" />
            <LogoutButton lang={lang} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="px-6 py-8 sm:px-8 lg:px-10">
              <span className="inline-flex items-center rounded-full border border-[#F5821F]/15 bg-[#FFF4E8] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[#F5821F]">
                {copy.heroLabel}
              </span>

              <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {copy.heroTitle}
              </h2>

              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
                {copy.heroBody}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-2xl font-bold text-slate-950">
                    {readyDemoCount}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {copy.ready}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-2xl font-bold text-slate-950">
                    {allSlots.length}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {copy.planned}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-2xl font-bold text-slate-950">
                    {plannedCurriculum.length}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {copy.systems}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-8 sm:px-8 lg:border-l lg:border-t-0 lg:px-10">
              <div className="flex h-full flex-col justify-between gap-7">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3.5 py-1.5 text-xs font-bold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    {copy.featured}
                  </div>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                    {lang === 'th'
                      ? 'อาการปวดหลังเฉียบพลัน'
                      : 'Acute Lower Back Pain'}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {copy.pathBody}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-950">
                    {copy.path}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {copy.pathBody}
                  </p>
                  <Link
                    href={`/dashboard/scenario/back-pain-scenario-001?lang=${lang}`}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#F5821F] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#D96F14] hover:shadow-md"
                  >
                    {lang === 'th' ? 'เข้าสู่แบบฝึก' : 'Start Practice'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              {copy.modules}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-700">
              {copy.modulesBody}
            </p>
          </div>

          <div className="space-y-7">
            {plannedCurriculum.map((section, sectionIndex) => (
              <section
                key={section.nameEn}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F5821F] text-base font-bold text-white shadow-sm">
                      {String(sectionIndex + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase text-[#F5821F]">
                        Clinical Module
                      </p>
                      <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                        {lang === 'th' ? section.nameTh : section.nameEn}
                      </h3>
                      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-700">
                        {lang === 'th'
                          ? section.subtitleTh
                          : section.subtitleEn}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
                  {section.slots.map((slot, slotIndex) => {
                    const status = getStatusContent(slot.status, lang)
                    const linkedScenario = slot.scenarioId
                      ? scenarioById.get(slot.scenarioId)
                      : null
                    const isReady =
                      slot.status === 'demo-ready' && Boolean(linkedScenario)

                    return (
                      <article
                        key={slot.slotId}
                        className={`flex min-h-[235px] flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                          isReady ? 'border-green-200' : 'border-slate-200'
                        }`}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-[12px] font-bold text-slate-700">
                            {copy.caseLabel} {String(slotIndex + 1).padStart(2, '0')}
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
                          {lang === 'th' ? slot.titleTh : slot.titleEn}
                        </h4>

                        <p className="mt-3 flex-1 text-[15px] leading-7 text-slate-700">
                          {linkedScenario?.description ??
                            (lang === 'th'
                              ? slot.descriptionTh
                              : slot.descriptionEn)}
                        </p>

                        {isReady && linkedScenario ? (
                          <Link
                            href={`/dashboard/scenario/${linkedScenario.id}?lang=${lang}`}
                            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#F5821F] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#D96F14] hover:shadow-md"
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
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
