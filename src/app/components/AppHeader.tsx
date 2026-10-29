'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Download,
  Edit3,
  History,
  Settings,
  UserCircle,
  Users,
  X,
} from 'lucide-react'
import LanguageToggle from './LanguageToggle'
import LogoutButton from './LogoutButton'
import {
  initialUpdateDisplayNameState,
  updateDisplayName,
} from '@/app/profile/actions'

type PageLanguage = 'th' | 'en'

type AppHeaderProps = {
  lang: PageLanguage
  studentLabel: string
  isAdmin: boolean
  pathname: string
  searchParams?: Record<string, string | undefined>
  onToggleAdminPanel?: () => void
  adminPanelOpen?: boolean
  rightSlot?: ReactNode
}

export default function AppHeader({
  lang,
  studentLabel,
  isAdmin,
  pathname,
  searchParams,
  onToggleAdminPanel,
  adminPanelOpen = false,
  rightSlot,
}: AppHeaderProps) {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [nameState, nameAction, namePending] = useActionState(
    updateDisplayName,
    initialUpdateDisplayNameState
  )

  useEffect(() => {
    if (!profileOpen) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () =>
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [profileOpen])

  useEffect(() => {
    if (!nameState.ok) return
    setEditOpen(false)
    setProfileOpen(false)
    router.refresh()
  }, [nameState.ok, router])

  const isThai = lang === 'th'
  const logoAlt = isThai ? 'PMC WeSmart' : 'PMC WeSmart'

  return (
    <header className="relative z-[100] shrink-0 border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link
          href={`/dashboard?lang=${lang}`}
          className="flex min-w-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5821F]"
          aria-label={logoAlt}
        >
          <img
            src="/brand/pmc-wesmart-horizontal.png"
            alt={logoAlt}
            className="h-10 w-auto max-w-[min(62vw,17rem)] object-contain object-left sm:h-11 sm:max-w-[22rem]"
          />
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {rightSlot}
          <LanguageToggle lang={lang} pathname={pathname} searchParams={searchParams} />
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-[#F5821F]/50 hover:bg-orange-50 hover:text-[#F5821F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5821F]"
              aria-label={isThai ? 'เปิดเมนูโปรไฟล์' : 'Open profile menu'}
              aria-expanded={profileOpen}
            >
              <UserCircle className="h-5 w-5" />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {isThai ? 'ผู้ใช้งาน' : 'Signed in as'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
                      {studentLabel}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-orange-50 hover:text-[#F5821F]"
                      aria-label={isThai ? 'แก้ไขชื่อ' : 'Edit name'}
                      title={isThai ? 'แก้ไขชื่อ' : 'Edit name'}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-1 space-y-0.5">
                  <Link
                    href={`/dashboard/history?lang=${lang}`}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
                  >
                    <History className="h-4 w-4 shrink-0" />
                    {isThai ? 'ประวัติ' : 'History'}
                  </Link>
                  {isAdmin ? (
                    <>
                      {onToggleAdminPanel ? (
                        <button
                          type="button"
                          onClick={() => {
                            onToggleAdminPanel()
                            setProfileOpen(false)
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-purple-700 transition hover:bg-purple-50"
                        >
                          <Settings className="h-4 w-4 shrink-0" />
                          {isThai ? 'แผงผู้สอน' : 'Teacher panel'}
                          {adminPanelOpen ? ' · เปิดอยู่' : ''}
                        </button>
                      ) : null}
                      <Link
                        href={`/dashboard/users?lang=${lang}`}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Users className="h-4 w-4 shrink-0" />
                        {isThai ? 'ผู้ใช้งาน' : 'Users'}
                      </Link>
                      <a
                        href={`/dashboard/export?lang=${lang}`}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        <Download className="h-4 w-4 shrink-0" />
                        {isThai ? 'ดาวน์โหลด Excel' : 'Download Excel'}
                      </a>
                    </>
                  ) : null}
                  <div className="my-1 border-t border-slate-100 pt-1">
                    <LogoutButton lang={lang} variant="menu" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[200] flex min-h-dvh items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-name-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-name-title" className="text-lg font-black text-slate-950">
                  {isThai ? 'แก้ไขชื่อผู้ใช้งาน' : 'Edit display name'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isThai ? 'ชื่อนี้จะแสดงในระบบและประวัติการทำรายการ' : 'This name appears across the system and history.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label={isThai ? 'ปิด' : 'Close'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={nameAction} className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-slate-700" htmlFor="display-name">
                {isThai ? 'ชื่อที่แสดง' : 'Display name'}
                <input
                  id="display-name"
                  name="name"
                  defaultValue={studentLabel}
                  required
                  minLength={2}
                  maxLength={80}
                  autoFocus
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#F5821F] focus:ring-2 focus:ring-orange-100"
                />
              </label>
              {nameState.error ? <p className="text-sm font-semibold text-red-600">{nameState.error}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {isThai ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={namePending}
                  className="rounded-full bg-[#F5821F] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#D96F14] disabled:cursor-wait disabled:opacity-60"
                >
                  {namePending ? (isThai ? 'กำลังบันทึก...' : 'Saving...') : isThai ? 'ยืนยัน' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  )
}
