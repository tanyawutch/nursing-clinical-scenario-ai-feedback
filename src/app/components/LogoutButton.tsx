'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'

type LogoutButtonProps = {
  lang: 'th' | 'en'
  variant?: 'default' | 'menu'
}

export default function LogoutButton({ lang, variant = 'default' }: LogoutButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const modal = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <h2 id="logout-confirm-title" className="text-lg font-bold text-slate-950">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{copy.body}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {copy.cancel}
          </button>
          <form action="/api/logout" method="post">
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
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          variant === 'menu'
            ? 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50'
            : 'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#F5821F]/40 hover:bg-[#FFF4E8] hover:text-[#F5821F] sm:text-sm'
        }
      >
        {variant === 'menu' ? <LogOut className="h-4 w-4 shrink-0" /> : null}
        {copy.button}
      </button>

      {isMounted && modal ? createPortal(modal, document.body) : null}
    </>
  )
}
