import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import { getOrCreateStudentProfile, needsProfileSetup } from '@/utils/authUser'
import { saveProfileName } from './actions'

type PageLanguage = 'th' | 'en'

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
}

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; error?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const lang = resolveLanguage(resolvedSearchParams.lang)
  const supabase = await createClient()
  const user = await getUserWithTimeout(supabase)

  if (!user) {
    redirect(`/login?lang=${lang}`)
  }

  const student = await getOrCreateStudentProfile(user)

  if (!needsProfileSetup(student)) {
    redirect(`/dashboard?lang=${lang}`)
  }

  const copy = {
    th: {
      title: 'ตั้งชื่อของคุณ',
      subtitle:
        'ชื่อที่ตั้งจะแสดงบนระบบและใช้เชื่อมกับประวัติการฝึกของคุณ',
      label: 'ชื่อที่ต้องการแสดง',
      placeholder: 'เช่น อาจารย์พิมพ์ชนก หรือ นศ.รหัส 6631501189',
      save: 'บันทึกและเข้าสู่ระบบ',
      error: 'กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร',
    },
    en: {
      title: 'Set Your Display Name',
      subtitle:
        'This name will be shown in the system and linked to your practice history.',
      label: 'Display name',
      placeholder: 'Example: Student 6631501189',
      save: 'Save and Continue',
      error: 'Please enter at least 2 characters.',
    },
  }[lang]

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-950">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5821F] text-sm font-black text-white">
            MFU
          </div>
          <h1 className="text-2xl font-black tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {copy.subtitle}
          </p>
        </div>

        {resolvedSearchParams.error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {copy.error}
          </div>
        ) : null}

        <form action={saveProfileName} className="space-y-5">
          <input type="hidden" name="lang" value={lang} />
          <div>
            <label htmlFor="name" className="text-sm font-bold text-slate-700">
              {copy.label}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              defaultValue=""
              placeholder={copy.placeholder}
              className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm outline-none transition focus:border-[#F5821F] focus:ring-2 focus:ring-[#F5821F]/20"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#F5821F] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#D96F14]"
          >
            {copy.save}
          </button>
        </form>
      </section>
    </main>
  )
}
