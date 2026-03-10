import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import type { AdminRole } from '@/lib/admin-auth'
import AdminShell from './components/AdminShell'
import SkipLink from './components/SkipLink'
import { Lock, Monitor } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { isAdmin, adminUser } = await checkAdminAccess({ id: user.id, email: user.email! })
  const role: AdminRole = adminUser?.role ?? 'admin'

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--background) text-(--text-primary) p-4">
        <div className="max-w-md w-full bg-(--surface) p-8 rounded-2xl border border-(--border) text-center shadow-2xl">
          <div className="w-16 h-16 bg-(--error-bg) text-(--error) rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black mb-2">Zugriff verweigert</h1>
          <p className="text-(--text-secondary) mb-6">
            Dieser Bereich ist nur für Administratoren zugänglich.
          </p>
          <div className="bg-(--surface-sunken) p-3 rounded-xl border border-(--border) mb-6">
            <p className="text-xs uppercase text-(--text-muted) font-bold tracking-wider mb-1">Angemeldet als</p>
            <p className="font-mono text-(--brand) text-sm">{user.email}</p>
          </div>
          <a href="/dashboard" className="block w-full bg-(--text-primary) text-(--background) font-bold py-3 rounded-xl hover:opacity-90 transition">
            Zurück zum Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <SkipLink />
      {/* Desktop gate — show warning on small screens */}
      <div className="xl:hidden min-h-screen flex items-center justify-center bg-(--background) text-(--text-primary) p-8">
        <div className="max-w-sm text-center">
          <Monitor className="w-12 h-12 text-(--text-muted) mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Desktop erforderlich</h1>
          <p className="text-(--text-secondary) text-sm">
            Das Admin-Dashboard ist für Desktop-Bildschirme optimiert. Bitte verwende einen Bildschirm mit mindestens 1280px Breite.
          </p>
        </div>
      </div>
      {/* Main shell — hidden below xl */}
      <div className="hidden xl:block min-h-screen bg-(--background) text-(--text-primary) font-sans antialiased">
        <AdminShell role={role} userId={user.id}>
          {children}
        </AdminShell>
      </div>
    </>
  )
}
