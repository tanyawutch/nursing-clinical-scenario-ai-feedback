import Link from 'next/link'

type LanguageToggleProps = {
  lang: 'th' | 'en'
  pathname: string
  searchParams?: Record<string, string | undefined>
}

function buildHref({
  pathname,
  searchParams,
  lang,
}: {
  pathname: string
  searchParams?: Record<string, string | undefined>
  lang: 'th' | 'en'
}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value && key !== 'lang') {
      params.set(key, value)
    }
  }

  params.set('lang', lang)

  return `${pathname}?${params.toString()}`
}

export default function LanguageToggle({
  lang,
  pathname,
  searchParams,
}: LanguageToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-slate-300 bg-white p-1 shadow-sm">
      <Link
        href={buildHref({ pathname, searchParams, lang: 'th' })}
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
          lang === 'th'
            ? 'bg-[#F5821F] text-white'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        ไทย
      </Link>
      <Link
        href={buildHref({ pathname, searchParams, lang: 'en' })}
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
          lang === 'en'
            ? 'bg-[#F5821F] text-white'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        EN
      </Link>
    </div>
  )
}
