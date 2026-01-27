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
      <div className="min-h-screen bg-black text-white p-4 sm:p-6 md:p-8">
        <div className="w-full space-y-6 sm:space-y-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 border-b border-zinc-900 pb-6 sm:pb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                  Mission Control
                </h1>
              </div>
              <p className="text-sm sm:text-base text-zinc-500 font-medium">BotlLab Analytics & Insights</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-xs uppercase font-bold text-zinc-600 tracking-widest">Environment</p>
                <p className="text-zinc-300 font-mono text-sm">Production</p>
              </div>
              <div className="h-10 w-px bg-zinc-800 hidden md:block"></div>
              <a 
                href="/dashboard" 
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold border border-zinc-800 transition flex items-center gap-2 text-xs sm:text-sm"
              >
                <span>⬅️</span> <span className="hidden sm:inline">App</span>
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
