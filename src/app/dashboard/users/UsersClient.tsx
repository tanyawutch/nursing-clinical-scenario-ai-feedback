'use client'

import Link from 'next/link'
import { Fragment } from 'react'
import { useState } from 'react'
import {
  ArrowLeft,
  Eye,
  Mail,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import LogoutButton from '@/app/components/LogoutButton'
import PracticeFeedbackPanel, {
  type SubmittedAnswerSection,
} from '@/app/components/PracticeFeedbackPanel'
import {
  createManagedUser,
  deleteManagedUser,
  resetManagedUserAttempts,
  updateManagedUser,
} from './actions'

type PageLanguage = 'th' | 'en'

export type ManagedAttemptHistory = {
  id: string
  scenarioTitle: string
  scenarioKind: 'test' | 'exercise'
  taskTitle: string
  score: string
  duration: string
  submittedAt: string
  answer: string
  feedback: string
  guidance: string
  aiScore?: string | null
  aiStatus?: string | null
  numericScore?: number | null
  maxScore?: number | null
  passScore?: number | null
  matchedElements?: string[] | null
  missingElements?: string[] | null
  answerSections?: SubmittedAnswerSection[] | null
  modelAnswer?: string | null
  modelAnswerRevealed?: boolean | null
}

export type ManagedUser = {
  key: string
  authUserId: string
  studentDbId: string
  email: string
  name: string
  studentId: string
  attemptsCount: number
  testAttemptsCount: number
  exerciseAttemptsCount: number
  authCreatedAt: string
  lastSignInAt: string
  hasAuthAccount: boolean
  history: ManagedAttemptHistory[]
}

type UsersClientProps = {
  lang: PageLanguage
  statusCopy: string
  managedUsers: ManagedUser[]
}

function fieldClass() {
  return 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#F5821F] focus:ring-2 focus:ring-[#F5821F]/15'
}

function formatDate(value: string, lang: PageLanguage) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function UsersClient({
  lang,
  statusCopy,
  managedUsers,
}: UsersClientProps) {
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)

  const copy = {
    th: {
      title: 'จัดการผู้ใช้งาน',
      subtitle: 'เพิ่ม ลบ แก้ไขบัญชี และตรวจประวัติการทำของผู้เรียน',
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
      attempts: 'จำนวนครั้ง',
      testAttempts: 'แบบทดสอบ',
      exerciseAttempts: 'แบบฝึกหัด',
      lastLogin: 'เข้าสู่ระบบล่าสุด',
      view: 'ดูข้อมูล',
      edit: 'แก้ไขข้อมูล',
      newPassword: 'รหัสผ่านใหม่',
      blankPassword: 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน',
      save: 'บันทึก',
      delete: 'ลบผู้ใช้งาน',
      deleteConfirm: 'ยืนยันการลบผู้ใช้งานนี้และประวัติทั้งหมด',
      reset: 'รีเซ็ตจำนวนครั้ง',
      resetTest: 'รีเซ็ตแบบทดสอบ',
      resetExercise: 'รีเซ็ตแบบฝึกหัด',
      resetAll: 'รีเซ็ตทั้งหมด',
      resetConfirm: 'ยืนยันการรีเซ็ตจำนวนครั้งของผู้ใช้งานนี้',
      noUsers: 'ยังไม่มีผู้ใช้งานในระบบ',
      history: 'ประวัติการทดสอบและฝึกซ้อม',
      noHistory: 'ยังไม่มีประวัติการทำแบบทดสอบหรือแบบฝึกหัด',
      scenario: 'สถานการณ์',
      kind: 'ประเภท',
      score: 'คะแนน',
      duration: 'เวลาที่ใช้',
      submittedAt: 'เวลาส่ง',
      answer: 'คำตอบ',
      feedback: 'คำแนะนำจากระบบ',
      recommendation: 'รายละเอียดคำแนะนำจากระบบ',
      close: 'ปิด',
    },
    en: {
      title: 'User Management',
      subtitle: 'Manage accounts and review learner activity history.',
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
      attempts: 'Attempts',
      testAttempts: 'Tests',
      exerciseAttempts: 'Practices',
      lastLogin: 'Last login',
      view: 'View',
      edit: 'Edit user',
      newPassword: 'New password',
      blankPassword: 'Leave blank to keep current password.',
      save: 'Save changes',
      delete: 'Delete user',
      deleteConfirm: 'Confirm deleting this user and all history',
      reset: 'Reset attempts',
      resetTest: 'Reset tests',
      resetExercise: 'Reset practices',
      resetAll: 'Reset all',
      resetConfirm: 'Confirm resetting this user’s attempts',
      noUsers: 'No users yet.',
      history: 'Test and practice history',
      noHistory: 'No test or practice history yet.',
      scenario: 'Scenario',
      kind: 'Type',
      score: 'Score',
      duration: 'Duration',
      submittedAt: 'Submitted',
      answer: 'Answer',
      feedback: 'System guidance',
      recommendation: 'System recommendations',
      close: 'Close',
    },
  }[lang]

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
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
              <input required type="email" name="email" className={`mt-1 ${fieldClass()}`} />
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
              <input required type="text" name="name" className={`mt-1 ${fieldClass()}`} />
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
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[980px] border-collapse bg-white text-left text-sm">
                <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">{copy.name}</th>
                    <th className="px-4 py-3">{copy.email}</th>
                    <th className="px-4 py-3">{copy.studentId}</th>
                    <th className="px-4 py-3">{copy.auth}</th>
                    <th className="px-4 py-3">{copy.attempts}</th>
                    <th className="px-4 py-3">{copy.lastLogin}</th>
                    <th className="px-4 py-3 text-right">{copy.view}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {managedUsers.map((managedUser) => (
                    <tr key={managedUser.key} className="align-middle">
                      <td className="px-4 py-4 font-black text-slate-950">
                        {managedUser.name || '-'}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {managedUser.email || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {managedUser.studentId || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            managedUser.hasAuthAccount
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {managedUser.hasAuthAccount ? copy.auth : copy.noAuth}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-700">
                        <div className="font-black text-slate-950">
                          {managedUser.attemptsCount}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          <p>
                            {copy.testAttempts}: {managedUser.testAttemptsCount}
                          </p>
                          <p>
                            {copy.exerciseAttempts}: {managedUser.exerciseAttemptsCount}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {formatDate(managedUser.lastSignInAt, lang)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(managedUser)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-[#F5821F] transition hover:bg-orange-100"
                          aria-label={`${copy.view} ${managedUser.name || managedUser.email}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#F5821F]">
                  {copy.view}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {selectedUser.name || selectedUser.email}
                </h3>
                <p className="text-sm text-slate-600">{selectedUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                aria-label={copy.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-4 font-black text-slate-950">{copy.edit}</h4>
                <form action={updateManagedUser} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="authUserId" value={selectedUser.authUserId} />
                  <input type="hidden" name="studentDbId" value={selectedUser.studentDbId} />
                  <input type="hidden" name="originalEmail" value={selectedUser.email} />
                  <label className="text-xs font-bold text-slate-600">
                    {copy.email}
                    <input
                      required
                      type="email"
                      name="email"
                      defaultValue={selectedUser.email}
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
                      defaultValue={selectedUser.name}
                      className={`mt-1 ${fieldClass()}`}
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    {copy.studentId}
                    <input
                      type="text"
                      name="studentId"
                      defaultValue={selectedUser.studentId}
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
              </section>

              <section className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <h4 className="font-black text-blue-950">{copy.reset}</h4>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {[
                      ['test', copy.resetTest],
                      ['exercise', copy.resetExercise],
                      ['all', copy.resetAll],
                    ].map(([scope, label]) => (
                      <form
                        key={scope}
                        action={resetManagedUserAttempts}
                        className="rounded-xl border border-blue-200 bg-white p-3"
                      >
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="studentDbId" value={selectedUser.studentDbId} />
                        <input type="hidden" name="scope" value={scope} />
                        <label className="mb-2 flex items-start gap-1.5 text-[11px] font-bold text-blue-800">
                          <input
                            required
                            type="checkbox"
                            className="mt-0.5"
                            disabled={!selectedUser.studentDbId}
                          />
                          <span>{copy.resetConfirm}</span>
                        </label>
                        <button
                          type="submit"
                          disabled={!selectedUser.studentDbId}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>

                <form
                  action={deleteManagedUser}
                  className="rounded-2xl border border-red-200 bg-red-50 p-4"
                >
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="authUserId" value={selectedUser.authUserId} />
                  <input type="hidden" name="studentDbId" value={selectedUser.studentDbId} />
                  <input type="hidden" name="email" value={selectedUser.email} />
                  <h4 className="font-black text-red-950">{copy.delete}</h4>
                  <label className="mt-3 flex items-start gap-2 text-xs font-bold text-red-700">
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
              </section>

              <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="font-black text-slate-950">{copy.history}</h4>
                {selectedUser.history.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                    {copy.noHistory}
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
                      <thead className="bg-slate-100 font-black uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-3 py-2">{copy.submittedAt}</th>
                          <th className="px-3 py-2">{copy.kind}</th>
                          <th className="px-3 py-2">{copy.scenario}</th>
                          <th className="px-3 py-2">{copy.score}</th>
                          <th className="px-3 py-2">{copy.duration}</th>
                          <th className="px-3 py-2">{copy.answer}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedUser.history.map((item) => (
                          <Fragment key={item.id}>
                            <tr className="align-top">
                              <td className="px-3 py-3 text-slate-600">
                                {formatDate(item.submittedAt, lang)}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                                    item.scenarioKind === 'test'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  {item.scenarioKind === 'test'
                                    ? copy.testAttempts
                                    : copy.exerciseAttempts}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-slate-700">
                                <p className="font-bold text-slate-950">{item.scenarioTitle}</p>
                                <p className="mt-1 text-slate-500">{item.taskTitle}</p>
                              </td>
                              <td className="px-3 py-3 font-black text-slate-950">
                                {item.score}
                              </td>
                              <td className="px-3 py-3 text-slate-700">
                                {item.duration}
                              </td>
                              <td className="max-w-[420px] px-3 py-3">
                                <p className="max-h-32 overflow-y-auto whitespace-pre-line rounded-lg bg-slate-50 p-2 leading-5 text-slate-700">
                                  {item.answer || '-'}
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={6} className="bg-slate-50 px-3 py-4">
                                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">
                                  {copy.recommendation}
                                </p>
                                <PracticeFeedbackPanel
                                  lang={lang}
                                  score={item.aiScore}
                                  aiStatus={item.aiStatus}
                                  numericScore={item.numericScore}
                                  maxScore={item.maxScore}
                                  passScore={item.passScore}
                                  matchedElements={item.matchedElements}
                                  missingElements={item.missingElements}
                                  baseReasoning={item.feedback}
                                  answerSections={
                                    item.answerSections?.length
                                      ? item.answerSections
                                      : [
                                          {
                                            id: `${item.id}-answer`,
                                            label: copy.answer,
                                            answer: item.answer,
                                          },
                                        ]
                                  }
                                  modelAnswer={item.modelAnswer}
                                  modelAnswerRevealed={item.modelAnswerRevealed}
                                  remainingAttempts={0}
                                  compact
                                />
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
