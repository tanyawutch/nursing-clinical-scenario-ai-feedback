import { logout } from '@/app/logout/actions'

type LogoutButtonProps = {
  lang: 'th' | 'en'
}

export default function LogoutButton({ lang }: LogoutButtonProps) {
  const label = lang === 'th' ? '\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a' : 'Logout'

  return (
    <form action={logout}>
      <input type="hidden" name="lang" value={lang} />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#A73535]/40 hover:bg-[#fff7f7] hover:text-[#A73535] sm:text-sm"
      >
        {label}
      </button>
    </form>
  )
}
