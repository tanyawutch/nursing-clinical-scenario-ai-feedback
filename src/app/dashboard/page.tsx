import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/utils/prisma'

export default async function DashboardPage() {
  // 1. Verify User Session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Extract Student ID from Email
  const studentId = user.email?.split('@')[0]

  // 2. Fetch Scenarios from Supabase Database dynamically
  const scenarios = await prisma.scenario.findMany({
    orderBy: {
      title: 'asc', 
    },
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#aa1e2d] rounded-full flex items-center justify-center border border-[#d4af37]">
              <span className="text-[#d4af37] font-bold text-xs">MFU</span>
            </div>
            <h1 className="text-xl font-bold text-[#aa1e2d]">Clinical Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              ID: {studentId}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Available Scenarios</h2>
          <p className="mt-1 text-slate-500">Select a clinical case to begin your assessment.</p>
        </div>

        {/* Dynamic Scenario Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <div 
              key={scenario.id} 
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-[#aa1e2d] transition-all flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="inline-flex items-center rounded-md bg-[#fff5f5] px-2 py-1 text-xs font-semibold text-[#aa1e2d] ring-1 ring-inset ring-[#aa1e2d]/20">
                  {scenario.bodySystem}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{scenario.title}</h3>
              <p className="text-sm text-slate-600 mb-6 line-clamp-2 flex-grow">{scenario.description}</p>
              
              {/* Replaced button with Link for Dynamic Routing */}
              <Link 
                href={`/dashboard/scenario/${scenario.id}`}
                className="mt-4 w-full text-center block rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#aa1e2d] transition-colors"
              >
                Start Assessment
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}