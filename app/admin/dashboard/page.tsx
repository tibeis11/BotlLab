import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import DashboardClient from './components/DashboardClient'
import SkipLink from './components/SkipLink'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  
  if (!allowedEmails.includes(user.email?.toLowerCase() || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <div className="max-w-md w-full bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            🔒
          </div>
          <h1 className="text-2xl font-black mb-2 text-white">Zugriff verweigert</h1>
          <p className="text-zinc-400 mb-6">
            Dieser Bereich ist nur für Administratoren zugänglich.
          </p>
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-6">
            <p className="text-xs uppercase text-zinc-600 font-bold tracking-wider mb-1">Angemeldet als</p>
            <p className="font-mono text-cyan-500 text-sm">{user.email}</p>
          </div>
          <a href="/dashboard" className="block w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition">
            Zurück zum Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <SkipLink />
      <div className="min-h-screen bg-black text-white p-4 sm:p-6 md:p-8 font-sans antialiased">
        <div className="max-w-[1600px] mx-auto w-full space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Overview
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wide">
                  Admin
                </span>
              </div>
              <p className="text-sm text-zinc-500">BotlLab Analytics & Insights</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-0.5">Environment</p>
                <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <p className="text-zinc-300 font-mono text-xs">Production</p>
                </div>
              </div>
              <div className="h-8 w-px bg-zinc-800 hidden md:block"></div>
              <a 
                href="/dashboard" 
                className="bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white px-4 py-2 rounded-md text-sm font-medium border border-zinc-800 transition-colors flex items-center gap-2"
              >
                <span>←</span> <span className="hidden sm:inline">Back to App</span>
              </a>
            </div>
          </header>
          
          <main id="main-content">
            <DashboardClient userId={user.id} />
          </main>
        </div>
      </div>
    </>
  )
}
