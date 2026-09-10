import LanguageToggle from '@/app/components/LanguageToggle'
import { login, loginWithGoogle } from './actions'

type PageLanguage = 'th' | 'en'

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
}

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; lang?: string }>
}) {
  const searchParams = await props.searchParams
  const lang = resolveLanguage(searchParams?.lang)
  const error = searchParams?.error

  const copy = {
    th: {
      school: 'สำนักวิชาพยาบาลศาสตร์',
      system: 'ระบบฝึกทักษะการซักประวัติผู้ป่วยผ่านสถานการณ์จำลอง',
      email: 'อีเมล',
      emailPlaceholder: 'กรอกอีเมลของคุณ',
      password: 'รหัสผ่าน',
      passwordPlaceholder: 'กรอกรหัสผ่าน',
      signIn: 'เข้าสู่ระบบ',
      google: 'เข้าสู่ระบบด้วย Google',
      invalid: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      failed: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่',
      footer: 'มหาวิทยาลัยแม่ฟ้าหลวง',
    },
    en: {
      school: 'School of Nursing',
      system: 'Patient History Taking & Clinical Scenario Simulation Platform',
      email: 'Email',
      emailPlaceholder: 'Enter your email',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      signIn: 'Sign In',
      google: 'Continue with Google',
      invalid: 'Incorrect email or password.',
      failed: 'Login failed. Please try again.',
      footer: 'Mae Fah Luang University',
    },
  }[lang]

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] p-4 font-sans">
      <div className="w-full max-w-md space-y-8 rounded-lg border-t-4 border-t-[#C2410C] bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex justify-end">
          <LanguageToggle
            lang={lang}
            pathname="/login"
            searchParams={{ error }}
          />
        </div>

        <div className="space-y-2 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#C2410C]">
              <span className="text-xl font-bold text-[#d4af37]">MFU</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-[#C2410C]">
            Mae Fah Luang
          </h1>
          <h2 className="text-lg font-semibold text-gray-700">
            {copy.school}
          </h2>
          <p className="mt-2 text-sm font-medium text-gray-500">
            {copy.system}
          </p>
        </div>

        <form className="mt-8 space-y-6" action={login}>
          <input type="hidden" name="lang" value={lang} />

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-[#C2410C]">
              {error === 'Invalid Credentials' ? copy.invalid : copy.failed}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700"
            >
              {copy.email}
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder={copy.emailPlaceholder}
                className="block w-full rounded-md border border-gray-300 px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-[#C2410C] focus:outline-none focus:ring-1 focus:ring-[#C2410C] sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700"
            >
              {copy.password}
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder={copy.passwordPlaceholder}
                className="block w-full rounded-md border border-gray-300 px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-[#C2410C] focus:outline-none focus:ring-1 focus:ring-[#C2410C] sm:text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full justify-center rounded-md border border-transparent bg-[#C2410C] px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:border-[#d4af37] hover:bg-[#8a1824] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
          >
            {copy.signIn}
          </button>
        </form>

        <form action={loginWithGoogle}>
          <input type="hidden" name="lang" value={lang} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs font-black text-[#C2410C]">
              G
            </span>
            {copy.google}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} {copy.footer}
          </p>
        </div>
      </div>
    </div>
  )
}
