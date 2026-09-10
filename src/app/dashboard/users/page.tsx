import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import LogoutButton from '@/app/components/LogoutButton'
import { isAdminEmail, normalizeEmail } from '@/utils/authUser'
import prisma from '@/utils/prisma'
import { createAdminClient } from '@/utils/supabase/admin'
import { getUserWithTimeout } from '@/utils/supabase/auth'
import { createClient } from '@/utils/supabase/server'
import {
  createManagedUser,
  deleteManagedUser,
  updateManagedUser,
} from './actions'

type PageLanguage = 'th' | 'en'

type ManagedUser = {
  key: string
  authUserId: string
  studentDbId: string
  email: string
  name: string
  studentId: string
  attemptsCount: number
  authCreatedAt: string
  lastSignInAt: string
  hasAuthAccount: boolean
}

function resolveLanguage(lang?: string): PageLanguage {
  return lang === 'en' ? 'en' : 'th'
}

function formatDate(value: string, lang: PageLanguage) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function fieldClass() {
  return 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#F5821F] focus:ring-2 focus:ring-[#F5821F]/15'
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; status?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const lang = resolveLanguage(resolvedSearchParams.lang)
  const supabase = await createClient()
  const currentUser = await getUserWithTimeout(supabase)

  if (!currentUser) {
    redirect(`/login?lang=${lang}`)
  }

  if (!isAdminEmail(currentUser.email)) {
    redirect(`/dashboard?lang=${lang}`)
  }

  const copy = {
    th: {
      title: 'จัดการผู้ใช้งาน',
      subtitle: 'เพิ่ม ลบ และแก้ไขบัญชีผู้เรียนที่ใช้งานระบบ',
      back: 'กลับหน้าเลือกสถานการณ์',
      addTitle: 'เพิ่มผู้ใช้งานใหม่',
      email: 'อีเมล',
      password: 'รหัสผ่าน',
      name: 'ชื่อที่แสดงในระบบ',
      studentId: 'รหัส/ID ผู้เรียน',
      optionalStudentId: 'เว้นว่างได้ ระบบจะใช้ชื่อหน้าอีเมลแทน',
      create: 'เพิ่มผู้ใช้งาน',
      users: 'รายชื่อผู้ใช้งาน',
      auth: 'บัญชีล็อกอิน',
      noAuth: 'ยังไม่มีบัญชีล็อกอิน',
      attempts: 'ประวัติการซ้อม',
      created: 'สร้างบัญชีเมื่อ',
      lastLogin: 'เข้าสู่ระบบล่าสุด',
      edit: 'แก้ไขข้อมูล',
      newPassword: 'รหัสผ่านใหม่',
      blankPassword: 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน',
      save: 'บันทึก',
      delete: 'ลบผู้ใช้งาน',
      deleteConfirm: 'ยืนยันการลบผู้ใช้งานนี้และประวัติทั้งหมด',
      noUsers: 'ยังไม่มีผู้ใช้งานในระบบ',
      statusCreated: 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว',
      statusUpdated: 'บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
      statusDeleted: 'ลบผู้ใช้งานเรียบร้อยแล้ว',
    },
    en: {
      title: 'User Management',
      subtitle: 'Create, update, and remove learner accounts.',
      back: 'Back to dashboard',
      addTitle: 'Add User',
      email: 'Email',
      password: 'Password',
      name: 'Display name',
      studentId: 'Student ID',
      optionalStudentId: 'Optional. The email prefix is used by default.',
      create: 'Create user',
      users: 'Users',
      auth: 'Login account',
      noAuth: 'No login account',
      attempts: 'Practice history',
      created: 'Created',
      lastLogin: 'Last login',
      edit: 'Edit user',
      newPassword: 'New password',
      blankPassword: 'Leave blank to keep current password.',
      save: 'Save changes',
      delete: 'Delete user',
      deleteConfirm: 'Confirm deleting this user and all history',
      noUsers: 'No users yet.',
      statusCreated: 'User created.',
      statusUpdated: 'User updated.',
      statusDeleted: 'User deleted.',
    },
  }[lang]

  const [students, authUsersResult] = await Promise.all([
    prisma.student.findMany({
      include: {
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    createAdminClient().auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),
  ])

  if (authUsersResult.error) {
    throw new Error(authUsersResult.error.message)
  }

  const usersByEmail = new Map(
    authUsersResult.data.users.map((user) => [
      normalizeEmail(user.email),
      user,
    ])
  )
  const studentsByEmail = new Map(
    students
      .filter((student) => student.email)
      .map((student) => [normalizeEmail(student.email), student])
  )
  const mergedEmails = new Set<string>([
    ...Array.from(usersByEmail.keys()),
    ...Array.from(studentsByEmail.keys()),
  ])

  const managedUsers: ManagedUser[] = Array.from(mergedEmails)
    .map((email) => {
      const authUser = usersByEmail.get(email)
      const student = studentsByEmail.get(email)
      const metadataName =
        typeof authUser?.user_metadata?.display_name === 'string'
          ? authUser.user_metadata.display_name
          : ''

      return {
        key: email || authUser?.id || student?.id || crypto.randomUUID(),
        authUserId: authUser?.id ?? '',
        studentDbId: student?.id ?? '',
        email,
        name: student?.name || metadataName || '',
        studentId: student?.studentId || email.split('@')[0] || '',
        attemptsCount: student?._count.attempts ?? 0,
        authCreatedAt: authUser?.created_at ?? '',
        lastSignInAt: authUser?.last_sign_in_at ?? '',
        hasAuthAccount: Boolean(authUser),
      }
    })
    .sort((first, second) => first.email.localeCompare(second.email))

  const statusCopy =
    resolvedSearchParams.status === 'created'
      ? copy.statusCreated
      : resolvedSearchParams.status === 'updated'
        ? copy.statusUpdated
        : resolvedSearchParams.status === 'deleted'
          ? copy.statusDeleted
          : ''

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <Link
              href={`/dashboard?lang=${lang}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F5821F]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {copy.back}
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5821F] text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-black">{copy.title}</h1>
                <p className="text-sm text-slate-600">{copy.subtitle}</p>
              </div>
            </div>
          </div>
          <LogoutButton lang={lang} />
        </header>

        {statusCopy ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {statusCopy}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#F5821F]" />
            <h2 className="font-black">{copy.addTitle}</h2>
          </div>

          <form action={createManagedUser} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="lang" value={lang} />
            <label className="text-xs font-bold text-slate-600">
              {copy.email}
              <input
                required
                type="email"
                name="email"
                className={`mt-1 ${fieldClass()}`}
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              {copy.password}
              <input
                required
                minLength={6}
                type="password"
                name="password"
                className={`mt-1 ${fieldClass()}`}
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              {copy.name}
              <input
                required
                type="text"
                name="name"
                className={`mt-1 ${fieldClass()}`}
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              {copy.studentId}
              <input
                type="text"
                name="studentId"
                placeholder={copy.optionalStudentId}
                className={`mt-1 ${fieldClass()}`}
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#F5821F] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#D96F14]"
              >
                <Plus className="h-4 w-4" />
                {copy.create}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[#F5821F]" />
            <h2 className="font-black">{copy.users}</h2>
          </div>

          {managedUsers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              {copy.noUsers}
            </p>
          ) : (
            <div className="grid gap-3">
              {managedUsers.map((managedUser) => (
                <article
                  key={managedUser.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black">
                          {managedUser.name || managedUser.studentId || '-'}
                        </h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                            managedUser.hasAuthAccount
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {managedUser.hasAuthAccount ? copy.auth : copy.noAuth}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {managedUser.email || '-'}
                        </span>
                        <span>
                          {copy.studentId}: {managedUser.studentId || '-'}
                        </span>
                        <span>
                          {copy.attempts}: {managedUser.attemptsCount}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          {copy.created}: {formatDate(managedUser.authCreatedAt, lang)}
                        </span>
                        <span>
                          {copy.lastLogin}: {formatDate(managedUser.lastSignInAt, lang)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer text-sm font-black text-[#F5821F]">
                      <span className="inline-flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        {copy.edit}
                      </span>
                    </summary>

                    <div className="mt-4 grid gap-4">
                      <form
                        action={updateManagedUser}
                        className="grid gap-3 md:grid-cols-2"
                      >
                        <input type="hidden" name="lang" value={lang} />
                        <input
                          type="hidden"
                          name="authUserId"
                          value={managedUser.authUserId}
                        />
                        <input
                          type="hidden"
                          name="studentDbId"
                          value={managedUser.studentDbId}
                        />
                        <input
                          type="hidden"
                          name="originalEmail"
                          value={managedUser.email}
                        />
                        <label className="text-xs font-bold text-slate-600">
                          {copy.email}
                          <input
                            required
                            type="email"
                            name="email"
                            defaultValue={managedUser.email}
                            className={`mt-1 ${fieldClass()}`}
                          />
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          {copy.newPassword}
                          <input
                            minLength={6}
                            type="password"
                            name="password"
                            placeholder={copy.blankPassword}
                            className={`mt-1 ${fieldClass()}`}
                          />
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          {copy.name}
                          <input
                            required
                            type="text"
                            name="name"
                            defaultValue={managedUser.name}
                            className={`mt-1 ${fieldClass()}`}
                          />
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          {copy.studentId}
                          <input
                            type="text"
                            name="studentId"
                            defaultValue={managedUser.studentId}
                            className={`mt-1 ${fieldClass()}`}
                          />
                        </label>
                        <div className="md:col-span-2">
                          <button
                            type="submit"
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-700"
                          >
                            {copy.save}
                          </button>
                        </div>
                      </form>

                      <form
                        action={deleteManagedUser}
                        className="rounded-xl border border-red-200 bg-red-50 p-3"
                      >
                        <input type="hidden" name="lang" value={lang} />
                        <input
                          type="hidden"
                          name="authUserId"
                          value={managedUser.authUserId}
                        />
                        <input
                          type="hidden"
                          name="studentDbId"
                          value={managedUser.studentDbId}
                        />
                        <input
                          type="hidden"
                          name="email"
                          value={managedUser.email}
                        />
                        <label className="flex items-start gap-2 text-xs font-bold text-red-700">
                          <input required type="checkbox" className="mt-0.5" />
                          <span>{copy.deleteConfirm}</span>
                        </label>
                        <button
                          type="submit"
                          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          {copy.delete}
                        </button>
                      </form>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
