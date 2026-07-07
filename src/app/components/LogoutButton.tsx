'use client'

import { useState } from 'react'
import { logout } from '@/app/logout/actions'

type LogoutButtonProps = {
  lang: 'th' | 'en'
}

export default function LogoutButton({ lang }: LogoutButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const copy = {
    th: {
      button: 'ออกจากระบบ',
      title: 'ยืนยันการออกจากระบบ',
      body: 'ต้องการออกจากระบบตอนนี้หรือไม่? ระบบจะพากลับไปหน้าเข้าสู่ระบบ',
      cancel: 'ยกเลิก',
      confirm: 'ออกจากระบบ',
    },
    en: {
      button: 'Logout',
      title: 'Confirm logout',
      body: 'Do you want to log out now? You will return to the login page.',
      cancel: 'Cancel',
      confirm: 'Logout',
    },
  }[lang]

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#F5821F]/40 hover:bg-[#FFF4E8] hover:text-[#F5821F] sm:text-sm"
      >
        {copy.button}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-950">{copy.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{copy.body}</p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {copy.cancel}
              </button>
              <form action={logout}>
                <input type="hidden" name="lang" value={lang} />
                <button
                  type="submit"
                  className="rounded-full bg-[#F5821F] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#D96F14]"
                >
                  {copy.confirm}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}